// Authentication substrate for feature 05-accounts.
// Hand-rolled OAuth2 Auth-Code + PKCE via fetch + Web Crypto only — no SDK.
// Session cookie carries a random token; only its SHA-256 hash lives in D1.
import type { D1Database } from '@cloudflare/workers-types';

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

// Unambiguous alphabet: A-Z minus I and O; digits 2-9 (removes 0 and 1).
// 32 symbols → 32^6 ≈ 1 billion combinations for a 5-minute single-use code.
const DEVICE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEVICE_CODE_LEN = 6;
export const DEVICE_CODE_TTL_SECONDS = 300; // 5 minutes

/**
 * Generates a short human-readable device code formatted as "XXX-XXX".
 * Uses only unambiguous characters (no I, O, 0, 1).
 */
export function generateDeviceCode(): string {
  const buf = new Uint8Array(DEVICE_CODE_LEN);
  crypto.getRandomValues(buf);
  const chars = Array.from(buf, b => DEVICE_CODE_ALPHABET[b % DEVICE_CODE_ALPHABET.length]!).join('');
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

/** Normalizes a user-entered code: uppercase, strip dashes/spaces. */
export function normalizeDeviceCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, '');
}

/** Returns true if a normalized (dash-stripped) code looks structurally valid. */
export function isValidDeviceCodeFormat(normalized: string): boolean {
  return normalized.length === DEVICE_CODE_LEN && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(normalized);
}

/** Returns a cryptographically random hex string of `byteLen * 2` chars. */
export function randomHex(byteLen = 32): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 of an arbitrary string, returned as a lowercase hex digest. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf), b => b.toString(16).padStart(2, '0')).join('');
}

/** Base64url-encodes a Uint8Array (no padding). */
function base64url(buf: Uint8Array): string {
  let bin = '';
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

export interface PkceChallenge {
  verifier: string;
  challenge: string;
}

/**
 * Generates a PKCE code_verifier and the corresponding S256 code_challenge.
 * Both providers (Google, X) require PKCE.
 */
export async function generatePkce(): Promise<PkceChallenge> {
  const verifier = randomHex(32); // 256-bit entropy, URL-safe hex
  const verifierBytes = new TextEncoder().encode(verifier);
  const hashBuf = await crypto.subtle.digest('SHA-256', verifierBytes);
  const challenge = base64url(new Uint8Array(hashBuf));
  return { verifier, challenge };
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'evbingo_session';
export const SESSION_TTL_DAYS = 90;

/** Generates a random opaque session token (raw; stored hashed in DB). */
export function randomToken(): string {
  return randomHex(32);
}

/**
 * Issues a new session: inserts the hashed token into D1, GCs expired rows in
 * the same batch, and returns the raw token (to be set as cookie).
 */
export async function issueSession(db: D1Database, accountId: string): Promise<string> {
  const token = randomToken();
  const hash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const nowIso = now.toISOString();
  const expiresIso = expiresAt.toISOString();

  await db.batch([
    db.prepare(
      'INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(hash, accountId, nowIso, expiresIso),
    // opportunistic GC — expired sessions
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso),
    // opportunistic GC — stale oauth_state (older than 10 minutes)
    db.prepare("DELETE FROM oauth_state WHERE created_at < datetime(?, '-10 minutes')").bind(nowIso),
  ]);

  return token;
}

export interface SessionPayload {
  accountId: string;
}

/**
 * Reads the session from the request cookie.
 * Returns `null` when absent, invalid, or expired.
 */
export async function getSession(request: Request, db: D1Database): Promise<SessionPayload | null> {
  const cookie = request.headers.get('cookie') ?? '';
  const token = parseCookieValue(cookie, SESSION_COOKIE);
  if (!token) return null;

  const hash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await db
    .prepare('SELECT account_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(hash, now)
    .first<{ account_id: string }>();

  return row ? { accountId: row.account_id } : null;
}

/**
 * Revokes a session: deletes its DB row by hashing the raw cookie token.
 * No-op if the token was already expired/deleted.
 */
export async function revokeSession(db: D1Database, token: string): Promise<void> {
  const hash = await sha256Hex(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
}

/** Builds the Set-Cookie header value for the session cookie. */
export function buildSessionCookieHeader(token: string, expiresAt: Date): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Path=/`,
    `Expires=${expiresAt.toUTCString()}`,
  ].join('; ');
}

/** Builds a Set-Cookie header that clears the session cookie. */
export function buildClearSessionCookieHeader(): string {
  return [
    `${SESSION_COOKIE}=`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Path=/`,
    `Max-Age=0`,
  ].join('; ');
}

// ---------------------------------------------------------------------------
// OAuth state helpers
// ---------------------------------------------------------------------------

/**
 * Inserts a new oauth_state row (with PKCE verifier) and GCs stale rows.
 */
export async function createOauthState(
  db: D1Database,
  state: string,
  provider: string,
  codeVerifier: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      'INSERT INTO oauth_state (state, provider, code_verifier, created_at) VALUES (?, ?, ?, ?)'
    ).bind(state, provider, codeVerifier, now),
    db.prepare("DELETE FROM oauth_state WHERE created_at < datetime(?, '-10 minutes')").bind(now),
  ]);
}

export interface OauthStateRow {
  provider: string;
  code_verifier: string;
}

/**
 * Consumes (DELETEs) an oauth_state row by state value, enforcing:
 * - single-use (DELETE is the read),
 * - freshness (older than 10 minutes → null),
 * - provider match.
 *
 * Returns the row on success, null on any failure.
 */
export async function consumeOauthState(
  db: D1Database,
  state: string,
  expectedProvider: string
): Promise<OauthStateRow | null> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const row = await db
    .prepare(
      'SELECT provider, code_verifier FROM oauth_state WHERE state = ? AND created_at > ?'
    )
    .bind(state, tenMinutesAgo)
    .first<OauthStateRow>();

  if (!row || row.provider !== expectedProvider) return null;

  await db.prepare('DELETE FROM oauth_state WHERE state = ?').bind(state).run();
  return row;
}

// ---------------------------------------------------------------------------
// Account upsert
// ---------------------------------------------------------------------------

export interface AccountInfo {
  provider: string;
  providerUserId: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Upserts an account by (provider, provider_user_id).
 * On conflict refreshes email + display_name (they can change at provider).
 * Returns the account id.
 */
export async function upsertAccount(db: D1Database, info: AccountInfo): Promise<string> {
  const existing = await db
    .prepare('SELECT id FROM accounts WHERE provider = ? AND provider_user_id = ?')
    .bind(info.provider, info.providerUserId)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare('UPDATE accounts SET email = ?, display_name = ? WHERE id = ?')
      .bind(info.email, info.displayName, existing.id)
      .run();
    return existing.id;
  }

  const id = randomHex(8);
  await db
    .prepare(
      'INSERT INTO accounts (id, provider, provider_user_id, email, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(id, info.provider, info.providerUserId, info.email, info.displayName, new Date().toISOString())
    .run();
  return id;
}

// ---------------------------------------------------------------------------
// Cookie parsing
// ---------------------------------------------------------------------------

function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k?.trim() === name) return rest.join('=').trim() || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

export interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  /** Full URL including any required query params (e.g. X's user.fields). */
  userinfoUrl: string;
  scopes: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** X uses HTTP Basic auth (client_id:secret) for the token exchange. */
  useBasicAuth: boolean;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: 'openid email profile',
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
    useBasicAuth: false,
  },
  x: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    userinfoUrl: 'https://api.twitter.com/2/users/me?user.fields=name,username',
    scopes: 'users.read tweet.read',
    clientIdEnv: 'X_OAUTH_CLIENT_ID',
    clientSecretEnv: 'X_OAUTH_CLIENT_SECRET',
    useBasicAuth: true,
  },
};

export type Provider = keyof typeof PROVIDERS;

export function isValidProvider(p: string): p is Provider {
  return p in PROVIDERS;
}

// ---------------------------------------------------------------------------
// OAuth flow helpers (code exchange + userinfo parsing)
// ---------------------------------------------------------------------------

/**
 * Exchanges the authorization code for an access token.
 * Returns the access token string, or throws on provider error.
 */
export async function exchangeCode(
  provider: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (config.useBasicAuth) {
    headers['Authorization'] = 'Basic ' + btoa(`${clientId}:${clientSecret}`);
  } else {
    body.set('client_secret', clientSecret);
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error('No access_token in response');
  return data.access_token;
}

/**
 * Fetches the provider's userinfo using the access token.
 * Returns normalized AccountInfo (email nullable, especially for X).
 */
export async function fetchProviderUserInfo(
  provider: string,
  accessToken: string
): Promise<AccountInfo> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const res = await fetch(config.userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Userinfo fetch failed: ${res.status}`);
  const data = await res.json() as Record<string, unknown>;

  if (provider === 'google') {
    return {
      provider: 'google',
      providerUserId: String(data.sub ?? ''),
      email: typeof data.email === 'string' ? data.email : null,
      displayName: typeof data.name === 'string' ? data.name : null,
    };
  }

  if (provider === 'x') {
    // X returns { data: { id, name, username } }; email is not available
    // under users.read + tweet.read scopes — stored as null.
    const xData = (data.data ?? {}) as Record<string, unknown>;
    return {
      provider: 'x',
      providerUserId: String(xData.id ?? ''),
      email: null,
      displayName: typeof xData.name === 'string' ? xData.name : null,
    };
  }

  throw new Error(`No userinfo parser for provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// Re-export the cookie name for use in endpoint files
// ---------------------------------------------------------------------------

export { SESSION_COOKIE };
