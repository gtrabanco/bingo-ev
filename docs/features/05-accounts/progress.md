# 05 — accounts · Progress

## P1 — Schema + session primitive ✅

- `migrations/0011_accounts.sql`: tables `accounts`, `sessions`, `oauth_state`;
  nullable `cards.account_id` column. Applied locally.
- `src/lib/auth.ts`: crypto helpers (`randomHex`, `sha256Hex`, `base64url`),
  PKCE generation (`generatePkce`), session issue/read/revoke with opportunistic GC,
  oauth_state create/consume, account upsert, provider config record for Google + X.
- Gate green (`npm run build`). No new runtime deps.

**Left open for P2:** HTTP endpoints, cookie Set-Cookie, redirect flow (Google).

## P2 + P3 — OAuth flow (Google + X) ✅

- `src/lib/auth.ts` extended: `exchangeCode`, `fetchProviderUserInfo` (Google + X
  response shapes), updated `ProviderConfig` with `useBasicAuth` flag (X uses
  Basic auth for token exchange), `SESSION_TTL_DAYS` exported.
- `GET /api/auth/[provider]/start`: generates state + PKCE, inserts `oauth_state`,
  GCs stale rows, redirects to provider authorize URL. Validates provider; 503 if
  env vars absent; 429 via `RATE_LIMITER_AUTH`.
- `GET /api/auth/[provider]/callback`: consumes single-use state (CSRF guard),
  exchanges code + verifier, fetches userinfo, upserts account, issues session cookie
  (`HttpOnly; Secure; SameSite=Lax`). Always redirects to `/` — no open redirect.
- `POST /api/auth/logout`: revokes session, clears cookie, redirects to `/`.
- Both Google and X covered by the same `[provider]` dynamic routes; X tolerates
  null email (identity is `data.id`); unknown providers → 404.
- Manual verification (`auth:google-login`, `auth:csrf`, `auth:open-redirect`,
  `auth:x-login`) requires provider test apps + `.dev.vars` — deferred to deployer.
- Gate green.
