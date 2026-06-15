// DELETE /api/groups/:id — the owner dissolves the room. Every member card is
// unlinked first (cards are NEVER deleted here — marks and diplomas stay with
// their owners), then the group row goes. Owner-only, proven by the owner
// card's id + secret.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkRateLimit } from '../../../../lib/rate-limit';

const ID_PATTERN = /^[0-9a-z]{8}$/;

interface GroupRow {
  owner_card_id: string | null;
}

export const DELETE: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return Response.json({ error: 'bad_request' }, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await checkRateLimit('RATE_LIMITER_WRITE', ip))) {
    return Response.json({ error: 'ratelimited' }, { status: 429 });
  }

  let cardId = '';
  let secret = '';
  try {
    const body: unknown = await request.json();
    const data = body as { cardId?: unknown; secret?: unknown };
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!ID_PATTERN.test(cardId) || !secret) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const group = await env.DB.prepare('SELECT owner_card_id FROM groups WHERE id = ?1')
    .bind(groupId)
    .first<GroupRow>();
  if (!group) return Response.json({ error: 'not_found' }, { status: 404 });
  if (!group.owner_card_id || group.owner_card_id !== cardId) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const owner = await env.DB.prepare('SELECT 1 FROM cards WHERE id = ?1 AND secret = ?2')
    .bind(cardId, secret)
    .first();
  if (!owner) return Response.json({ error: 'forbidden' }, { status: 403 });

  await env.DB.batch([
    env.DB.prepare('UPDATE cards SET group_id = NULL WHERE group_id = ?1').bind(groupId),
    env.DB.prepare('DELETE FROM groups WHERE id = ?1').bind(groupId),
  ]);

  return new Response(null, { status: 204 });
};
