// POST /api/auth/logout — revoke the current session and clear the cookie.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession, revokeSession, buildClearSessionCookieHeader, SESSION_COOKIE } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const cookie = request.headers.get('cookie') ?? '';
  // Extract raw token from cookie to pass to revokeSession.
  const token = parseCookieValue(cookie, SESSION_COOKIE);

  if (token) {
    // getSession already checks expiry; but we revoke regardless to clean up.
    await revokeSession(env.DB, token);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': buildClearSessionCookieHeader(),
    },
  });
};

function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k?.trim() === name) return rest.join('=').trim() || null;
  }
  return null;
}
