// GET /api/cards/:id?k=secret — owner rehydration: returns the full card
//   state so a recovery link can resume play on a fresh device.
// DELETE /api/cards/:id — discard a regenerated or expired card. Completed
//   cards are immune: their record is what makes issued diplomas verifiable.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELL_COUNT, unpackMarks } from '../../../../lib/card';

const ID_PATTERN = /^[0-9a-z]{8}$/;

interface FullRow {
  created_at: string;
  completed_at: string | null;
  cells: string | null;
  marks: string | null;
}

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const secret = new URL(request.url).searchParams.get('k') ?? '';
  if (!secret) return new Response(null, { status: 400 });

  const row = await env.DB.prepare(
    'SELECT created_at, completed_at, cells, marks FROM cards WHERE id = ?1 AND secret = ?2',
  )
    .bind(id, secret)
    .first<FullRow>();
  if (!row || !row.cells) return new Response(null, { status: 404 });

  let cells: (string | null)[];
  try {
    const parsed: unknown = JSON.parse(row.cells);
    if (!Array.isArray(parsed) || parsed.length !== CELL_COUNT) throw new Error('bad cells');
    cells = parsed.map((cell) => (typeof cell === 'string' ? cell : null));
  } catch {
    return new Response(null, { status: 404 });
  }

  const marks =
    row.marks && row.marks.length === CELL_COUNT
      ? unpackMarks(row.marks)
      : Array(CELL_COUNT).fill(0);

  return Response.json({
    id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    cells,
    marks,
    secret,
  });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret: string | null = null;
  try {
    const body: unknown = await request.json();
    const raw = (body as { secret?: unknown })?.secret;
    if (typeof raw === 'string') secret = raw;
  } catch {
    // Legacy clients send no body; rows without a secret still match below.
  }

  // Owner-only for rows issued with a secret; legacy rows (secret NULL)
  // remain deletable without one. Completed cards are always immune.
  await env.DB.prepare(
    'DELETE FROM cards WHERE id = ?1 AND completed_at IS NULL AND (secret IS NULL OR secret = ?2)',
  )
    .bind(id, secret)
    .run();
  return new Response(null, { status: 204 });
};
