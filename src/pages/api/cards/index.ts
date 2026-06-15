// POST /api/cards — issue a new card: server-generated id, creation time and
// owner secret. The client sends its cell layout (situation ids) so the card
// can be watched read-only at /c/<id>; texts are always resolved server-side
// from the situations pool, so the layout carries no free-form content.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELL_COUNT, getSituation, newCardId } from '../../../lib/card';
import { orphanedOwnerRepair, settleDeparture } from '../../../lib/groups';
import { verifyTurnstile } from '../../../lib/turnstile';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

function newSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

function parseCells(value: unknown): (string | null)[] | null {
  if (!Array.isArray(value) || value.length !== CELL_COUNT) return null;
  const cells: (string | null)[] = [];
  for (const cell of value) {
    if (cell === null) {
      cells.push(null);
    } else if (typeof cell === 'string' && getSituation(cell)) {
      cells.push(cell);
    } else {
      return null;
    }
  }
  return cells.some((cell) => cell !== null) ? cells : null;
}

export const POST: APIRoute = async ({ request }) => {
  const db = env.DB;

  let cells: (string | null)[] | null = null;
  let alias: string | null = null;
  let tsToken = '';
  try {
    const body: unknown = await request.json();
    const data = body as { cells?: unknown; alias?: unknown; 'cf-turnstile-response'?: unknown };
    cells = parseCells(data?.cells);
    // Optional alias: a display label carried by the card from birth, so the
    // player shows up named in group standings without re-typing it.
    if (typeof data?.alias === 'string') {
      alias = data.alias.replace(CONTROL_CHARS, '').trim().slice(0, 32) || null;
    }
    if (typeof data?.['cf-turnstile-response'] === 'string') tsToken = data['cf-turnstile-response'];
  } catch {
    // No body: still issue a card, it just won't be watchable at /c/<id>.
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await verifyTurnstile(tsToken, ip))) return new Response(null, { status: 403 });

  const id = newCardId();
  const secret = newSecret();
  const createdAt = new Date().toISOString();

  // 12-month retention GC: completed cards older than a year are swept.
  // Grouped ones must have their departure settled first so the room's
  // winner/owner pointers stay consistent and empty rooms dissolve — the
  // same invariant as any other card removal (see settleDeparture in groups.ts).
  // In the common case (no such old cards) the SELECT returns 0 rows and the
  // loop is a no-op.
  const expiredGrouped = await db
    .prepare(
      `SELECT id, group_id FROM cards
       WHERE completed_at IS NOT NULL
         AND group_id IS NOT NULL
         AND datetime(completed_at) < datetime('now', '-12 months')`,
    )
    .all<{ id: string; group_id: string }>();
  for (const { id, group_id } of expiredGrouped.results) {
    await settleDeparture(group_id, id);
  }

  // Opportunistic GC: expired, never-completed cards vanish so the table
  // stays tiny. One day of slack so the precise (clamped) JS expiry check
  // at completion time always wins over SQLite's month arithmetic.
  // The completed-card sweep runs in the same batch for atomicity.
  await db.batch([
    db.prepare(
      "DELETE FROM cards WHERE completed_at IS NULL AND datetime(created_at) < datetime('now', '-1 month', '-1 day')",
    ),
    // Remove completed cards older than 12 months (grouped ones settled above).
    db.prepare(
      "DELETE FROM cards WHERE completed_at IS NOT NULL AND datetime(completed_at) < datetime('now', '-12 months')",
    ),
    // Backstop: repair any owner pointers the sweeps above may have orphaned.
    orphanedOwnerRepair(),
    db
      .prepare(
        'INSERT INTO cards (id, created_at, secret, cells, marks, alias) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',
      )
      .bind(
        id,
        createdAt,
        secret,
        cells ? JSON.stringify(cells) : null,
        '0'.repeat(CELL_COUNT),
        alias,
      ),
  ]);

  return Response.json({ id, createdAt, secret }, { status: 201 });
};
