# 05 — accounts · PLAN

> Phase plan derived from `SPEC.md`. One phase per commit, gate-verified
> (`npm run build` green). Detailed checklists in `TASKS.md`.

## Sequencing rationale

Build the identity substrate inside-out: schema + session primitive first, then a
**single provider end-to-end** (Google) to prove the whole OAuth loop before
generalizing, then the second provider (X) over the now-abstracted flow, then the
account/card plumbing and the thin UI, and finally the legal disclosure + a
mandatory security pass over the new auth surface. Each phase is independently
gate-green; nothing requires a session until it exists.

## P1 — Schema + session primitive

- `migrations/0011_accounts.sql`: `accounts`, `sessions`, `oauth_state`,
  `cards.account_id`. Apply `--local`.
- `src/lib/auth.ts` (first slice): PKCE + random helpers (Web Crypto), session
  issue/read/revoke (`sha256` token hashing), opportunistic GC of expired
  `sessions`/`oauth_state`. No HTTP endpoints yet.
- **Gate.** No behavior change visible; build green.

## P2 — Google flow end-to-end

- Provider config record in `lib/auth.ts` (authorize/token/userinfo URLs, scopes,
  env var names).
- `GET /api/auth/google/start`, `GET /api/auth/google/callback`,
  `POST /api/auth/logout`.
- Session cookie set on callback; `oauth_state` single-use; redirect to `/`.
- **Gate + manual:** `auth:google-login`, `auth:returning`, `auth:logout`,
  `auth:csrf`, `auth:open-redirect` with a Google test app.

## P3 — X provider

- Generalize `:provider` routing to cover `x`; add X config + `users/me` identity
  read; tolerate absent email.
- **Gate + manual:** `auth:x-login` (verify null email path).

## P4 — Account/card plumbing + minimal UI

- `POST /api/account/link-card` (secret-guarded atomic `UPDATE`).
- `POST /api/cards`: stamp `account_id` when a session is present.
- `GET /api/account` (identity summary) + `DELETE /api/account` (delete account +
  sessions, null `cards.account_id`).
- `src/lib/api.ts`: `startLogin`, `logout`, `fetchAccount`, `linkCard`,
  `deleteAccount` — all degrade to `null`/`false`.
- `index.astro` menu affordance: login buttons / logged-in indicator + logout;
  post-login link of `localStorage` cards.
- **Gate + manual:** `auth:link-card`, `auth:create-logged-in`,
  `auth:account-delete`, `auth:degraded`.

## P5 — Legal + hardening

- `/privacidad`: new section (Google + X processors, session cookie, deletion
  right); correct the "no cookies" claim.
- `docs/legal/README.md`: add the new processors + session-cookie touchpoint.
- Rate-limit `:provider/start` + callback (reuse `lib/rate-limit.ts`).
- **Mandatory** `security-review` of the auth surface (CSRF/state, PKCE, cookie
  flags, open-redirect, no token persistence, secret re-check, session rotation).
- Resolve or track every finding.

## P6 — PR

- One PR against `main`; English body; flag the migration + the required provider
  secrets/redirect-URI setup for reviewers/deployer. Closes the tracking issue.

## P7 — Device-code cross-device transfer

- `migrations/0012_device_codes.sql`: table `device_codes` (code PK, card_id, created_at,
  expires_at, consumed_at). Apply `--local`.
- `src/lib/auth.ts` additions: `generateDeviceCode()` — 6 random chars from a
  32-char unambiguous alphabet (A-Z minus I/O + 2-9), formatted as `ABC-DEF`.
- `POST /api/cards/:id/device-code {secret}` — validates ownership, inserts code
  (TTL 5 min), GCs expired rows in batch, returns `{code, expiresIn: 300}`.
- `POST /api/device-code/claim {code}` — atomic single-use claim (check consumed_at IS NULL
  and expires_at > now in the UPDATE RETURNING, mark consumed_at); returns `{id, secret}`.
  Rate-limited via `RATE_LIMITER_CREATE`.
- `/activar` SSR page: reads `?code`; if present auto-POSTs claim and redirects to
  `/?card=ID&k=SECRET`; otherwise renders a text input form for manual code entry (Tesla path).
- `index.astro`: "Abrir en otro dispositivo" button — visible when a registered card exists
  (has id + secret); on click: calls `requestDeviceCode`, shows code + QR (`uqr`) in a
  dismissable panel. QR encodes `https://bingo.gruxon.com/activar?code=CODE`.
- `src/lib/api.ts`: `requestDeviceCode(cardId, secret)` → `{code, expiresIn} | null`.
- **Gate + manual:** `device:send`, `device:receive-qr`, `device:receive-manual`,
  `device:expired` (wait 5 min), `device:replay` (claim same code twice → 204/error).

## Review checkpoints

Per `execute-phase`: hand off to `/review-change` after P2 and P4, and once more
before the P6 PR. The auth surface (P2–P3) **must** get `security-review`.
