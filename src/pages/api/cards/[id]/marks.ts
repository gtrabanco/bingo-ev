// POST /api/cards/:id/marks — sync the owner's marks so /c/<id> stays live.
// Requires the owner secret; spectators with the public link can't touch it.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { CELL_COUNT } from '../../../../lib/card';

const ID_PATTERN = /^[0-9a-z]{8}$/;
const MARKS_PATTERN = new RegExp(`^[01]{${CELL_COUNT}}$`);

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

  const result = await env.DB.prepare(
    'UPDATE cards SET marks = ?3 WHERE id = ?1 AND secret = ?2',
  )
    .bind(id, secret, marks)
    .run();

  // No row matched: unknown card or wrong secret. Same answer for both.
  if (!result.meta.changes) return new Response(null, { status: 403 });
  return new Response(null, { status: 204 });
};
