// POST /api/groups/:id/kick — group moderation: the admin (creator) unlinks a
// member's card from the group. The card itself is never touched — kicking
// removes the membership, not the cartón, its marks or its diploma. If the
// kicked card was the room's winner, the win is vacated so the room reopens:
// their diploma survives (it lives on the card), they just lose this trophy.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

interface GroupRow {
  admin_secret: string | null;
}

export const POST: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return Response.json({ error: 'bad_request' }, { status: 400 });

  let adminSecret = '';
  let cardId = '';
  try {
    const body: unknown = await request.json();
    const data = body as { adminSecret?: unknown; cardId?: unknown };
    if (typeof data.adminSecret === 'string') adminSecret = data.adminSecret;
    if (typeof data.cardId === 'string') cardId = data.cardId;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!adminSecret || !ID_PATTERN.test(cardId)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const group = await env.DB.prepare('SELECT admin_secret FROM groups WHERE id = ?1')
    .bind(groupId)
    .first<GroupRow>();
  if (!group) return Response.json({ error: 'not_found' }, { status: 404 });
  // Pre-admin groups (admin_secret NULL) have no moderator: nobody kicks.
  if (!group.admin_secret || group.admin_secret !== adminSecret) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const result = await env.DB.prepare(
    'UPDATE cards SET group_id = NULL WHERE id = ?1 AND group_id = ?2',
  )
    .bind(cardId, groupId)
    .run();
  if (!result.meta.changes) return Response.json({ error: 'not_member' }, { status: 404 });

  // Vacate the trophy if the kicked card holds it — checked against CURRENT
  // state, not a pre-read: a completion can land between our earlier SELECT
  // and the unlink above, and a stale comparison would leave a ghost winner
  // (a non-member holding winner_card_id) that blocks the room forever.
  await env.DB.prepare(
    'UPDATE groups SET winner_card_id = NULL WHERE id = ?1 AND winner_card_id = ?2',
  )
    .bind(groupId, cardId)
    .run();

  return new Response(null, { status: 204 });
};
