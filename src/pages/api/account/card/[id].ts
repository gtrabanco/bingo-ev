// DELETE /api/account/card/:id — remove an active card from the logged-in account and delete it.
// Completed cards (diplomas) are protected. settleDeparture runs if the card was in a group.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession } from '../../../../lib/auth';
import { settleDeparture } from '../../../../lib/groups';

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  const cardId = params.id;
  if (!cardId) return new Response(null, { status: 400 });

  const card = await env.DB
    .prepare('SELECT id, group_id, completed_at, account_id FROM cards WHERE id = ?')
    .bind(cardId)
    .first<{ id: string; group_id: string | null; completed_at: string | null; account_id: string | null }>();

  if (!card) return new Response(null, { status: 404 });
  if (card.account_id !== session.accountId) return new Response(null, { status: 403 });
  if (card.completed_at !== null) return new Response(null, { status: 409 });

  // Re-assert ownership and active state atomically in the DELETE.
  await env.DB
    .prepare('DELETE FROM cards WHERE id = ? AND account_id = ? AND completed_at IS NULL')
    .bind(cardId, session.accountId)
    .run();

  if (card.group_id) {
    await settleDeparture(card.group_id, cardId);
  }

  return new Response(null, { status: 204 });
};
