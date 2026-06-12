// POST /api/groups/:id/leave — a member walks out of the room on their own.
// The card unlinks itself (proven by its owner secret) and keeps everything:
// marks, diploma, the lot. If the owner leaves, the office passes to the most
// veteran remaining member; if the last member leaves, the room dissolves.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { settleDeparture } from '../../../../lib/groups';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const POST: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return Response.json({ error: 'bad_request' }, { status: 400 });

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

  const result = await env.DB.prepare(
    'UPDATE cards SET group_id = NULL WHERE id = ?1 AND secret = ?2 AND group_id = ?3',
  )
    .bind(cardId, secret, groupId)
    .run();
  // No row: wrong secret, unknown card, or not a member. Same answer for all.
  if (!result.meta.changes) return Response.json({ error: 'not_member' }, { status: 403 });

  await settleDeparture(groupId, cardId);

  return new Response(null, { status: 204 });
};
