// GET  /api/account — return the logged-in account's minimal identity.
// DELETE /api/account — delete account, its sessions, and null account_id on cards.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  const row = await env.DB
    .prepare(
      `SELECT a.provider, a.display_name, a.email,
              (SELECT COUNT(*) FROM cards WHERE account_id = a.id) AS card_count
       FROM accounts a WHERE a.id = ?`
    )
    .bind(session.accountId)
    .first<{ provider: string; display_name: string | null; email: string | null; card_count: number }>();

  if (!row) return new Response(null, { status: 404 });

  return Response.json({
    provider: row.provider,
    displayName: row.display_name,
    email: row.email,
    cardCount: row.card_count,
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  const { accountId } = session;
  await env.DB.batch([
    // Null account_id on all linked cards — cards survive, secrets still work.
    env.DB.prepare('UPDATE cards SET account_id = NULL WHERE account_id = ?').bind(accountId),
    // Delete all sessions for this account.
    env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
    // Delete the account itself.
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId),
  ]);

  return new Response(null, { status: 204 });
};
