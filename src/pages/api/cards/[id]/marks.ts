// POST /api/cards/:id/marks — sync the owner's marks so /c/<id> stays live.
// Requires the owner secret; spectators with the public link can't touch it.
//
// Lifecycle rules (D3 — see decisions.md):
//   completed + within 24h grace + new marks break the bingo → clears completed_at
//   completed + past 24h lock                                 → 409 (immutable)
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELL_COUNT, areMarksLocked, unpackMarks } from '../../../../lib/card';
import { isFullCard } from '../../../../lib/wins';

const ID_PATTERN = /^[0-9a-z]{8}$/;
// Each digit is a MarkKind: 0 clean, 1 suffered, 2 caused (sinvergüenza).
const MARKS_PATTERN = new RegExp(`^[012]{${CELL_COUNT}}$`);

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret = '';
  let marks = '';
  try {
    const body: unknown = await request.json();
    const data = body as { secret?: unknown; marks?: unknown };
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.marks === 'string') marks = data.marks;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!secret || !MARKS_PATTERN.test(marks)) return new Response(null, { status: 400 });

  // Fetch current state to enforce the completion lifecycle before writing.
  const row = await env.DB.prepare(
    'SELECT completed_at, cells FROM cards WHERE id = ?1 AND secret = ?2',
  )
    .bind(id, secret)
    .first<{ completed_at: string | null; cells: string | null }>();

  // No row matched: unknown card or wrong secret. Same answer for both.
  if (!row) return new Response(null, { status: 403 });

  if (row.completed_at) {
    // Past the 24h grace window: marks are sealed.
    if (areMarksLocked(row.completed_at)) {
      return new Response(null, { status: 409 });
    }

    // Within grace: if the new marks no longer form a bingo, revoke the diploma.
    const cells: (string | null)[] = row.cells
      ? (JSON.parse(row.cells) as (string | null)[])
      : [];
    if (!isFullCard(cells, unpackMarks(marks))) {
      await env.DB.prepare(
        'UPDATE cards SET marks = ?3, completed_at = NULL WHERE id = ?1 AND secret = ?2',
      )
        .bind(id, secret, marks)
        .run();
      return new Response(null, { status: 204 });
    }
  }

  // Normal path: not completed, or still a full card after the change.
  await env.DB.prepare('UPDATE cards SET marks = ?3 WHERE id = ?1 AND secret = ?2')
    .bind(id, secret, marks)
    .run();

  return new Response(null, { status: 204 });
};
