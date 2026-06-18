// GET /api/auth/:provider/callback — OAuth2 callback: verify state, exchange code,
// fetch userinfo, upsert account, issue session cookie, redirect to /.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  consumeOauthState,
  exchangeCode,
  fetchProviderUserInfo,
  upsertAccount,
  issueSession,
  buildSessionCookieHeader,
  isValidProvider,
  PROVIDERS,
  SESSION_TTL_DAYS,
} from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/rate-limit';

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...vs] = part.trim().split('=');
    if (k?.trim() === name) return vs.join('=').trim() || null;
  }
  return null;
}

const CLEAR_OAUTH_COOKIE = 'evbingo_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

export const GET: APIRoute = async ({ params, request }) => {
  const provider = params.provider ?? '';
  if (!isValidProvider(provider)) {
    return new Response('Unknown provider', { status: 404 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return new Response(null, { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  // Verify state matches the cookie set at /start — prevents login-CSRF where an
  // attacker tricks a victim into completing a flow initiated by another browser.
  const cookieState = parseCookie(request.headers.get('Cookie'), 'evbingo_oauth');
  if (!cookieState || cookieState !== state) {
    return new Response('State mismatch', { status: 400 });
  }

  // Single-use state check — also guards replay.
  const stateRow = await consumeOauthState(env.DB, state, provider);
  if (!stateRow) {
    return new Response('Invalid or expired state', { status: 400 });
  }

  const config = PROVIDERS[provider];
  const clientId = (env as Record<string, string>)[config.clientIdEnv];
  const clientSecret = (env as Record<string, string>)[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return new Response('Provider not configured', { status: 503 });
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/${provider}/callback`;

  let accessToken: string;
  try {
    accessToken = await exchangeCode(
      provider,
      code,
      stateRow.code_verifier,
      redirectUri,
      clientId,
      clientSecret
    );
  } catch {
    return new Response('Token exchange failed', { status: 502 });
  }

  let userInfo;
  try {
    userInfo = await fetchProviderUserInfo(provider, accessToken);
  } catch {
    return new Response('Userinfo fetch failed', { status: 502 });
  }

  if (!userInfo.providerUserId) {
    return new Response('No user id from provider', { status: 502 });
  }

  const accountId = await upsertAccount(env.DB, userInfo);
  const token = await issueSession(env.DB, accountId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  // Always redirect to / — never use a request-supplied target (open-redirect guard).
  const headers = new Headers({
    Location: '/',
    'Set-Cookie': buildSessionCookieHeader(token, expiresAt),
  });
  headers.append('Set-Cookie', CLEAR_OAUTH_COOKIE);
  return new Response(null, { status: 302, headers });
};
