// GET /api/auth/:provider/start — initiate OAuth2 Authorization-Code + PKCE flow.
// Generates state + PKCE, persists oauth_state, redirects to provider authorize URL.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  generatePkce,
  randomHex,
  createOauthState,
  isValidProvider,
  PROVIDERS,
} from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/rate-limit';

export const GET: APIRoute = async ({ params, request }) => {
  const provider = params.provider ?? '';
  if (!isValidProvider(provider)) {
    return new Response('Unknown provider', { status: 404 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_AUTH', ip))) {
    return new Response(null, { status: 429 });
  }

  const config = PROVIDERS[provider];
  const clientId = (env as Record<string, string>)[config.clientIdEnv];
  if (!clientId) {
    return new Response('Provider not configured', { status: 503 });
  }

  const state = randomHex(16);
  const { verifier, challenge } = await generatePkce();

  await createOauthState(env.DB, state, provider, verifier);

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/${provider}/callback`;

  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', config.scopes);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  return Response.redirect(authorizeUrl.toString(), 302);
};
