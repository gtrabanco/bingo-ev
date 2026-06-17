// POST /api/cards/:id/gallery — owner toggle: hide or show this diploma in the
// public gallery. Requires the card to exist, be completed, and the secret to match.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret: string | null = null;
  let hidden: boolean | null = null;
  try {
    const body = (await request.json()) as { secret?: unknown; hidden?: unknown };
    if (typeof body.secret === 'string') secret = body.secret;
    if (typeof body.hidden === 'boolean') hidden = body.hidden;
  } catch {
    return new Response(null, { status: 400 });
  }

  if (hidden === null) return new Response(null, { status: 400 });

  const row = await env.DB.prepare(
    'SELECT secret, completed_at FROM cards WHERE id = ?1',
  )
    .bind(id)
    .first<{ secret: string | null; completed_at: string | null }>();

  if (!row) return new Response(null, { status: 404 });
  if (!row.completed_at) return new Response(null, { status: 409 }); // not completed
  if (row.secret !== null && row.secret !== secret) return new Response(null, { status: 403 });

  await env.DB.prepare('UPDATE cards SET gallery_hidden = ?2 WHERE id = ?1')
    .bind(id, hidden ? 1 : 0)
    .run();

  return new Response(null, { status: 204 });
};
