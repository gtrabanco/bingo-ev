// POST /api/cards — issue a new card: server-generated id, creation time and
// owner secret. The client sends its cell layout (situation ids) so the card
// can be watched read-only at /c/<id>; texts are always resolved server-side
// from the situations pool, so the layout carries no free-form content.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELL_COUNT, getSituation, newCardId } from '../../../lib/card';

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
  try {
    const body: unknown = await request.json();
    cells = parseCells((body as { cells?: unknown })?.cells);
  } catch {
    // No body: still issue a card, it just won't be watchable at /c/<id>.
  }

  const id = newCardId();
  const secret = newSecret();
  const createdAt = new Date().toISOString();

  // Opportunistic GC: expired, never-completed cards vanish so the table
  // stays tiny. One day of slack so the precise (clamped) JS expiry check
  // at completion time always wins over SQLite's month arithmetic.
  await db.batch([
    db.prepare(
      "DELETE FROM cards WHERE completed_at IS NULL AND datetime(created_at) < datetime('now', '-1 month', '-1 day')",
    ),
    db
      .prepare(
        'INSERT INTO cards (id, created_at, secret, cells, marks) VALUES (?1, ?2, ?3, ?4, ?5)',
      )
      .bind(id, createdAt, secret, cells ? JSON.stringify(cells) : null, '0'.repeat(CELL_COUNT)),
  ]);

  return Response.json({ id, createdAt, secret }, { status: 201 });
};
