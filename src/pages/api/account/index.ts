// GET  /api/account — return the logged-in account's minimal identity.
// DELETE /api/account — total erasure: deletes every card (active + completed),
//   settles each group departure, removes sessions and the account row.
//   Completed-card immunity is intentionally overridden here — this is the sole
//   user-initiated GDPR erasure path.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession } from '../../../lib/auth';
import { settleDeparture, orphanedOwnerRepair } from '../../../lib/groups';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  const row = await env.DB
    .prepare(
      `SELECT a.provider, a.display_name, a.email, a.public_handle, a.profile_public,
              (SELECT COUNT(*) FROM cards WHERE account_id = a.id) AS card_count
       FROM accounts a WHERE a.id = ?`
    )
    .bind(session.accountId)
    .first<{
      provider: string;
      display_name: string | null;
      email: string | null;
      public_handle: string | null;
      profile_public: number;
      card_count: number;
    }>();

  if (!row) return new Response(null, { status: 404 });

  return Response.json({
    provider: row.provider,
    displayName: row.display_name,
    email: row.email,
    cardCount: row.card_count,
    publicHandle: row.public_handle,
    profilePublic: row.profile_public === 1,
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  const { accountId } = session;

  // Collect every card (active and completed) before deleting them so we can
  // settle each group departure against post-delete state.
  const { results: cards } = await env.DB
    .prepare('SELECT id, group_id FROM cards WHERE account_id = ?')
    .bind(accountId)
    .all<{ id: string; group_id: string | null }>();

  // Delete cards first so settleDeparture sees the final (post-delete) membership.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM cards WHERE account_id = ?').bind(accountId),
    env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId),
  ]);

  // Settle each group the deleted cards belonged to.
  for (const c of cards) {
    if (c.group_id) await settleDeparture(c.group_id, c.id);
  }
  await orphanedOwnerRepair().run();

  return new Response(null, { status: 204 });
};
