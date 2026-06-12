// POST /api/groups/:id/standings — standings for a members-only (private)
// group. The visitor proves membership with their own card id + owner secret;
// non-members get a 403. Public groups render their standings server-side on
// the /g/<id> page and don't need this endpoint.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

interface GroupRow {
  name: string;
  winner_card_id: string | null;
  owner_card_id: string | null;
}

interface MemberRow {
  id: string;
  alias: string | null;
  nick: string | null;
  marks: string | null;
  completed_at: string | null;
}

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

  // Membership proof: the card must belong to this group and match its secret.
  const member = await env.DB.prepare(
    'SELECT id FROM cards WHERE id = ?1 AND secret = ?2 AND group_id = ?3',
  )
    .bind(cardId, secret, groupId)
    .first();
  if (!member) return new Response(null, { status: 403 });

  const group = await env.DB.prepare(
    'SELECT name, winner_card_id, owner_card_id FROM groups WHERE id = ?1',
  )
    .bind(groupId)
    .first<GroupRow>();
  if (!group) return new Response(null, { status: 404 });

  const rows = await env.DB.prepare(
    'SELECT id, alias, nick, marks, completed_at FROM cards WHERE group_id = ?1',
  )
    .bind(groupId)
    .all<MemberRow>();

  return Response.json({
    name: group.name,
    winnerCardId: group.winner_card_id,
    // Members-only response, so naming the owner here leaks nothing new:
    // the page uses it to decide who sees the moderation buttons.
    ownerCardId: group.owner_card_id,
    members: (rows.results ?? []).map((row) => ({
      id: row.id,
      alias: row.alias ?? row.nick,
      marks: row.marks,
      completedAt: row.completed_at,
    })),
  });
};
