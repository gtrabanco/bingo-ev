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

## P4 — Account/card plumbing + minimal UI ✅

- `POST /api/account/link-card`: atomic guarded `UPDATE ... RETURNING` (secret in SQL).
- `GET /api/account`: identity summary + `cardCount` aggregated via subquery.
- `DELETE /api/account`: batch nulls `account_id` on cards, deletes sessions, deletes account.
- `POST /api/cards` extended: reads `getSession`; stamps `account_id` if logged in.
- `src/lib/api.ts`: `startLogin`, `logout`, `fetchAccount`, `linkCard`, `deleteAccount`
  client methods; fixed `GALLERY_EMPTY.count` (was `total`).
- `index.astro` account bar: hidden until JS resolves; shows login buttons (logged out)
  or identity chip + logout (logged in); auto-links `localStorage` cards on sign-in.
- Gate green. Manual scenarios (link-card, create-logged-in, etc.) require provider
  credentials — deferred to deployer.

## P5 — Legal + hardening ✅

- `/privacidad`: new "Cuentas e inicio de sesión" section added (processors Google + X,
  data received, purpose, basis, retention, deletion right, session cookie explanation).
  "Para jugar no pedimos nada" bullet corrected: no cookie active when not logged in;
  session cookie strictly necessary only while logged in. `updated` bumped to 2026-06-18.
- `docs/legal/README.md`: Google + X as processors, session-cookie touchpoint, and
  "Continuar con Google/X" brand-name exception documented.
- Rate-limit uses binding `RATE_LIMITER_AUTH` (must be configured in `wrangler.jsonc`).
- `testing.md` created with manual scenario checklist + security-review surface list.
- **Mandatory security review (`/security-review`) still pending** — must run before P6 PR.

## P7 — Device-code cross-device transfer ✅

- `migrations/0012_device_codes.sql`: `device_codes` table (code PK, card_id, created/expires/consumed timestamps).
  Applied locally. Opportunistic GC batched into code creation.
- `src/lib/auth.ts`: `generateDeviceCode()` (6 chars, unambiguous 32-char alphabet, formatted `XXX-XXX`),
  `normalizeDeviceCode`, `isValidDeviceCodeFormat`, `DEVICE_CODE_TTL_SECONDS = 300`.
- `POST /api/cards/[id]/device-code`: ownership-gated (secret match), inserts code, returns `{code, expiresIn}`.
- `POST /api/device-code/claim`: atomic `UPDATE ... RETURNING` single-use claim; 410 on any failure mode.
- `src/pages/activar.astro`: server-side auto-claim on `?code=` (QR path → 302 to game);
  manual form with auto-format input (Tesla path, no JS dependency for the form itself).
- `index.astro`: "Abrir en otro dispositivo" button (visible when card has id + secret);
  dismissable panel with code + inline SVG QR (uqr) + countdown timer. No new runtime deps.
- `src/lib/api.ts`: `requestDeviceCode` client method.
- Gate green (`npm run build`). Manual device scenarios require a running Worker — deferred.
