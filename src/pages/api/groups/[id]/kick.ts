// POST /api/groups/:id/kick — group moderation: the owner unlinks a member's
// card from the room. The card itself is never touched — kicking removes the
// membership, not the cartón, its marks or its diploma. Ownership belongs to
// the owner's CARD (groups.owner_card_id), proven by its id + owner secret.
// Aftermath (trophy vacating, ownership handover, empty-room dissolution) is
// settled in settleDeparture.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { settleDeparture } from '../../../../lib/groups';
import { checkRateLimit } from '../../../../lib/rate-limit';

const ID_PATTERN = /^[0-9a-z]{8}$/;

interface GroupRow {
  owner_card_id: string | null;
}

export const POST: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return Response.json({ error: 'bad_request' }, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await checkRateLimit('RATE_LIMITER_WRITE', ip))) {
    return Response.json({ error: 'ratelimited' }, { status: 429 });
  }

  let cardId = '';
  let secret = '';
  let memberId = '';
  try {
    const body: unknown = await request.json();
    const data = body as { cardId?: unknown; secret?: unknown; memberId?: unknown };
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.memberId === 'string') memberId = data.memberId;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!ID_PATTERN.test(cardId) || !secret || !ID_PATTERN.test(memberId)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const group = await env.DB.prepare('SELECT owner_card_id FROM groups WHERE id = ?1')
    .bind(groupId)
    .first<GroupRow>();
  if (!group) return Response.json({ error: 'not_found' }, { status: 404 });
  // Ownerless rooms (pre-0008, or a creator whose card never joined and then
  // expired) have no moderator: nobody kicks.
  if (!group.owner_card_id || group.owner_card_id !== cardId) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  // The office is claimed with the owner card's own secret.
  const owner = await env.DB.prepare('SELECT 1 FROM cards WHERE id = ?1 AND secret = ?2')
    .bind(cardId, secret)
    .first();
  if (!owner) return Response.json({ error: 'forbidden' }, { status: 403 });

  const result = await env.DB.prepare(
    'UPDATE cards SET group_id = NULL WHERE id = ?1 AND group_id = ?2',
  )
    .bind(memberId, groupId)
    .run();
  if (!result.meta.changes) return Response.json({ error: 'not_member' }, { status: 404 });

  await settleDeparture(groupId, memberId);

  return new Response(null, { status: 204 });
};
