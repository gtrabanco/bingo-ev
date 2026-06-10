// POST /api/groups/:id/join — attach the caller's card to a group. Requires
// the card's owner secret, and only cards still in play can join (joining
// with an already-completed card would be an instant, unearned win).
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const POST: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return new Response(null, { status: 400 });

  let cardId = '';
  let secret = '';
  try {
    const body: unknown = await request.json();
    const data = body as { cardId?: unknown; secret?: unknown };
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!ID_PATTERN.test(cardId) || !secret) return new Response(null, { status: 400 });

  const group = await env.DB.prepare('SELECT id FROM groups WHERE id = ?1')
    .bind(groupId)
    .first();
  if (!group) return new Response(null, { status: 404 });

  const result = await env.DB.prepare(
    'UPDATE cards SET group_id = ?3 WHERE id = ?1 AND secret = ?2 AND completed_at IS NULL',
  )
    .bind(cardId, secret, groupId)
    .run();

  if (!result.meta.changes) return new Response(null, { status: 403 });
  return new Response(null, { status: 204 });
};
