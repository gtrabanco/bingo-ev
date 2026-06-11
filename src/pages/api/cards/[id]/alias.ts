// POST /api/cards/:id/alias — set the card's alias. The alias is a display
// label (group standings, shared views), never an identifier: identity stays
// with the card id + owner secret (and the optional recovery email).
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret = '';
  let alias = '';
  try {
    const body: unknown = await request.json();
    const data = body as { secret?: unknown; alias?: unknown };
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.alias === 'string') {
      alias = data.alias.replace(CONTROL_CHARS, '').trim().slice(0, 32);
    }
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!secret || !alias) return new Response(null, { status: 400 });

  const result = await env.DB.prepare(
    'UPDATE cards SET alias = ?3 WHERE id = ?1 AND secret = ?2',
  )
    .bind(id, secret, alias)
    .run();

  // No row matched: unknown card or wrong secret. Same answer for both.
  if (!result.meta.changes) return new Response(null, { status: 403 });
  return new Response(null, { status: 204 });
};
