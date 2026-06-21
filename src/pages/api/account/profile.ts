// POST /api/account/profile — set or update the logged-in account's public handle + visibility.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession } from '../../../lib/auth';
import { checkNick, BLOCK_MESSAGES } from '../../../lib/blocklist';

const HANDLE_RE = /^[a-z0-9-]{3,24}$/;

function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 24);
}

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  let body: { handle?: unknown; public?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  const handle = normalizeHandle(String(body.handle ?? ''));
  const isPublic = Boolean(body.public);

  if (!HANDLE_RE.test(handle)) {
    return Response.json({ error: 'handle_invalid' }, { status: 422 });
  }

  // Owner bypass: skip blocklist for the configured service owner account.
  // Keyed to env vars so no hardcoded values ship. Only queries the DB when at
  // least one owner var is set — zero overhead for deployments without them.
  const ownerEmail = (env.OWNER_EMAIL as string | undefined) ?? '';
  const ownerXId = (env.OWNER_X_USER_ID as string | undefined) ?? '';
  let isOwner = false;
  if (ownerEmail || ownerXId) {
    const acct = await env.DB
      .prepare('SELECT email, provider, provider_user_id FROM accounts WHERE id = ?')
      .bind(session.accountId)
      .first<{ email: string | null; provider: string; provider_user_id: string }>();
    isOwner =
      (acct?.provider === 'google' && ownerEmail !== '' && acct?.email === ownerEmail) ||
      (acct?.provider === 'x' && ownerXId !== '' && acct?.provider_user_id === ownerXId);
  }

  if (!isOwner) {
    const check = checkNick(handle);
    if (check.blocked) {
      return Response.json({ error: BLOCK_MESSAGES[check.reason] }, { status: 422 });
    }
  }

  try {
    await env.DB
      .prepare('UPDATE accounts SET public_handle = ?, profile_public = ? WHERE id = ?')
      .bind(handle, isPublic ? 1 : 0, session.accountId)
      .run();
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      return Response.json({ error: 'handle_taken' }, { status: 409 });
    }
    throw err;
  }

  return new Response(null, { status: 204 });
};
