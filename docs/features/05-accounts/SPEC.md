# 05 — accounts

> Feature specification. The doc read at the start of the workflow.

## Goal

Give players an **optional, durable identity** so the diplomas they earn across
different devices and over time can later be grouped under one owner. Identity is
established through **social login (Google and X)** and layered *additively* on top
of the existing card-id + owner-secret model — it never replaces it and is never
required to play. This feature ships the **identity substrate only**: the account,
the session, and the plumbing to link cards to an account. It deliberately ships
**no aggregation screen** (private "mis diplomas" list) and **no public profile**
(feature 09 owns that). It exists now because two downstream features — `06`
cross-card badges and `09` per-person public profiles — need a durable cross-card
identity the current per-card model cannot provide.

## Branch

`feat/05-accounts`

## Size

`M` — phased. Two OAuth providers, a session layer, three new tables, card-linking
endpoints, and a GDPR/legal update. No aggregation UI keeps it from reaching `L`.

## Dependencies

- **Hard:** none in-repo. Cards already carry `email`/`secret`; no prior feature
  must merge first.
- **External setup (blocks deploy, not development):** OAuth app registration with
  Google and X, providing client id/secret and registered redirect URIs for prod
  and local dev. See *Deploy & rollback*.

## Context

The app is **deliberately account-less and offline-first**: identity is a card id
(public, in URLs) plus an owner secret (in the owner's `localStorage`), and "the
alias is a label, never an identifier" is an architecture invariant
(`docs/architecture/ARCHITECTURE.md`). Email already exists, but only as a
per-card recovery handle (`cards.email`, `POST /api/recover`).

The gap: nothing ties a player's *multiple* cards together durably. Once you finish
a cartón there is nothing to chase, and any cross-card view is impossible. The
`achievements-badges` memo (`memory: achievements-badges-idea`) names this exactly
— cross-card badges "must aggregate across all of a player's cards … durable /
cross-device aggregation needs accounts (roadmap 05)". Feature `09 gallery-profiles`
was split out of `03 public-gallery` for the same reason and is gated on this one.

This feature introduces the missing durable identity primitive — and nothing more.

## Business goals

Returning-player retention: a durable identity is the precondition for the
"collection" loop (badges, profiles) that gives a finished player a reason to come
back and earn more diplomas. Social login (vs. email magic-link or passwords) was
chosen by the owner for the lowest-friction sign-in.

## Technical goals

- A durable, optional account identity keyed on `(provider, provider_user_id)`.
- Authentication via **hand-rolled OAuth 2.0 Authorization-Code + PKCE** using only
  platform built-ins (`fetch`, Web Crypto) — **no auth SDK / no new runtime
  dependency** (honors the project's hard convention).
- A minimal server-side **session** layer (cookie-based) that is *strictly
  necessary* and additive — no existing flow depends on it.
- Card↔account linking that is **secret-proven** and atomic, preserving the
  offline-first and group-ownership/handover invariants.

## Scope

### In scope

- Migration `0011_accounts.sql`: tables `accounts`, `sessions`, `oauth_state`; new
  nullable column `cards.account_id`.
- `src/lib/auth.ts`: OAuth helpers (PKCE generation, provider config, code
  exchange, userinfo fetch) and session helpers (issue, read, revoke), plus
  opportunistic GC of expired `sessions`/`oauth_state`.
- OAuth endpoints (both providers, uniform flow):
  - `GET /api/auth/:provider/start` — create state + PKCE, persist to `oauth_state`,
    redirect to the provider authorize URL.
  - `GET /api/auth/:provider/callback` — verify single-use state, exchange code,
    fetch userinfo, upsert account by `(provider, provider_user_id)`, issue session
    cookie, redirect to `/` (same-origin only).
  - `POST /api/auth/logout` — revoke session, clear cookie.
- `:provider` ∈ {`google`, `x`}.
- Account/card plumbing:
  - `POST /api/account/link-card` `{cardId, secret}` (session-auth) — set
    `cards.account_id` iff the secret matches, re-checked inside the SQL.
  - `POST /api/cards` extended: when a valid session is present, stamp the new
    card's `account_id` at creation.
  - `DELETE /api/account` (session-auth) — delete the account + its sessions and
    null `account_id` on its cards (cards survive, still owned by secret).
  - `GET /api/account` (session-auth) — return the logged-in account's minimal
    identity (`{ provider, displayName, email, cardCount }`) so the client can
    show logged-in state. (No diploma list — that is the deferred dashboard.)
- Minimal UI affordance in the existing game UI (`index.astro` menu): "Continuar
  con Google" / "Continuar con X" when logged out; account indicator + "Cerrar
  sesión" when logged in. After login, the client links its locally-known cards
  (it holds their secrets) via `link-card`.
- `src/lib/api.ts` client methods for the above, each degrading to `null`/`false`.
- `/privacidad` + `docs/legal/README.md` updates (new processors, session cookie,
  account deletion right).

### Out of scope / non-goals

- **Private "mis diplomas" aggregation screen / dashboard** — deferred (a future
  feature or a fast-follow); 05 ships only the substrate + login affordance.
- **Public per-person profile** and the gallery "N bingos by the same player"
  counter — owned by `09 gallery-profiles`.
- **Badges / cross-card achievement aggregation** — owned by `06`.
- **Auto-adopting cards by matching provider email** — explicitly excluded (a
  provider email is not proof of card ownership; could enable hijack). Linking is
  secret-proven only. Email-based adoption may be revisited later.
- **Password / passkey / magic-link / Apple login** — not in this feature.
- **Storing provider access/refresh tokens** — tokens are used once at callback to
  read identity, then discarded. No ongoing provider API calls.
- **Merging two social accounts** (e.g. same person via Google and X) into one —
  each `(provider, provider_user_id)` is a distinct account for now.

## Architecture impact

This feature introduces **authentication and sessions** into an app whose stated
pattern is "no accounts, no auth". That is a real addition, so it is constrained
hard to stay faithful to the invariants:

- **Strictly additive & optional.** No existing route requires a session. The game
  still plays fully with the Worker down and nobody logged in. The owner-secret
  remains the primary, offline identity; the account is a durable *aggregation*
  layer on top. (`ARCHITECTURE.md`: "the game must keep working with the Worker
  down" — unchanged.)
- **Identity invariant preserved.** "Alias is never an identifier" still holds. The
  account id is a new, *optional* durable identifier; aliases/nicks are untouched.
- **Layering.** New server logic lives in `src/lib/auth.ts` (server helpers via
  `import { env } from 'cloudflare:workers'`, same shape as `lib/groups.ts`); new
  routes under `src/pages/api/auth/` and `src/pages/api/account/`. **No new
  top-level `src/` folder** (that would itself be an architecture change).
- **Mutation safety preserved.** `link-card` re-checks the secret inside the
  atomic `UPDATE` (never read-then-write). Card deletion / group departure still
  runs `settleDeparture`; `account_id` is just another column on `cards` and does
  not alter group ownership or handover.
- **`prerender = false`** on every new dynamic route.
- **No new runtime dependency.** OAuth + PKCE + sessions are built from `fetch` and
  Web Crypto only. Do **not** introduce `arctic`, `oslo`, `@auth/*`, `jose`, etc.

### New cookie (legal-sensitive)

The app currently advertises "no cookies" (no banner needed). A **session cookie**
is added — `HttpOnly; Secure; SameSite=Lax; Path=/`. It is **strictly necessary**
(authentication), so it remains exempt from consent-banner requirements under
ePrivacy, **but the "no cookies" claim in `/privacidad` must be corrected** to "no
tracking/analytics cookies; a strictly-necessary session cookie only while logged
in". `SameSite=Lax` (not `Strict`) is required so the cookie survives the
top-level redirect back from the OAuth provider.

## Design

### Data model (migration `0011_accounts.sql`, additive)

```sql
CREATE TABLE accounts (
  id               TEXT PRIMARY KEY,         -- generated, opaque
  provider         TEXT NOT NULL,            -- 'google' | 'x'
  provider_user_id TEXT NOT NULL,            -- stable subject id from provider
  email            TEXT,                     -- secondary; may be null (esp. X)
  display_name     TEXT,                     -- from provider; NOT an identifier
  created_at       TEXT NOT NULL,
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,             -- SHA-256 of the cookie token
  account_id  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE oauth_state (
  state         TEXT PRIMARY KEY,           -- random; single-use
  provider      TEXT NOT NULL,
  code_verifier TEXT NOT NULL,              -- PKCE verifier
  created_at    TEXT NOT NULL
);

ALTER TABLE cards ADD COLUMN account_id TEXT;  -- nullable; null = unlinked
```

- The **session cookie carries a random token**; only its SHA-256 hash is stored,
  so a DB read cannot reconstruct live sessions. Lookup hashes the incoming cookie.
- `oauth_state` rows are **single-use**: consumed (DELETED) on callback. Both
  `sessions` and `oauth_state` are swept by an opportunistic GC batched into auth
  writes (same pattern as the card/group GC).

### OAuth flow (uniform for both providers, Authorization-Code + PKCE)

1. `GET /api/auth/:provider/start`
   - Reject unknown `:provider`.
   - Generate `state` (random) and PKCE `code_verifier`; compute `code_challenge`
     = base64url(SHA-256(verifier)) via Web Crypto.
   - Insert `oauth_state(state, provider, code_verifier, created_at)`; GC expired.
   - 302 to the provider authorize URL with `client_id`, `redirect_uri`,
     `response_type=code`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`.
2. `GET /api/auth/:provider/callback?code&state`
   - Look up + DELETE the `oauth_state` row (single-use); reject if missing/expired
     or `provider` mismatch (CSRF / replay defense).
   - POST to the provider token endpoint with `code`, `code_verifier`,
     `redirect_uri`, `client_id`, `client_secret`, `grant_type=authorization_code`.
   - Fetch identity (access token, discard after):
     - Google: `GET https://openidconnect.googleapis.com/v1/userinfo` → `sub`,
       `email`, `name`.
     - X: `GET https://api.twitter.com/2/users/me` → `data.id`, `data.name`,
       `data.username` (X usually returns no email → `email` stays null).
   - Upsert `accounts` by `(provider, provider_user_id)`; refresh `email`/`display_name`.
   - Issue a session: random token → cookie; store `sha256(token)` in `sessions`
     with `expires_at = now + 90 days`.
   - 302 to `/` **(hardcoded same-origin path — never a target taken from the
     request, to avoid open redirect)**.
3. `POST /api/auth/logout` — hash the cookie, DELETE the session row, clear cookie.

**Provider config** lives in `lib/auth.ts` as a small record per provider
(authorize URL, token URL, userinfo URL, scopes, env var names for id/secret).
Scopes: Google `openid email profile`; X `users.read tweet.read` (minimum to read
the user object). Tokens are never persisted.

### Card linking

- After login the client iterates its `localStorage` cards and calls
  `POST /api/account/link-card {cardId, secret}` for each. The endpoint runs an
  atomic guarded update:
  `UPDATE cards SET account_id = ?session_account WHERE id = ?cardId AND (secret = ?secret OR secret IS NULL)`
  — secret re-checked inside the SQL; legacy secret-less rows pass as today.
- `POST /api/cards` (issue): when a valid session cookie is present, set
  `account_id` on the newly created card so cards made while logged in are durably
  owned across devices without a separate link step.
- Linking **does not** touch group ownership, the owner secret, or `settleDeparture`
  — `account_id` is orthogonal.

### Session reading helper

`lib/auth.ts` exports `getSession(request) → { accountId } | null`: parse the
cookie, hash, `SELECT … FROM sessions WHERE token_hash = ? AND expires_at > now`.
Every account/auth endpoint uses it; absence ⇒ 401 for mutations, anonymous for
reads.

### Client (`lib/api.ts`)

`startLogin(provider)` (full-page redirect to `/api/auth/:provider/start`),
`logout()`, `fetchAccount()`, `linkCard(cardId, secret)`, `deleteAccount()` — all
degrade to `null`/`false` on failure. The login affordance is a full navigation,
not a `fetch` (OAuth needs top-level redirects).

## Decisions to confirm

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Auth mechanism | Social OAuth, **Google + X** (no Apple) | Owner choice; Apple requires a paid account. Lowest sign-in friction. |
| 2 | OAuth implementation | Hand-rolled Auth-Code + PKCE via `fetch`/Web Crypto | Honors "no new runtime deps"; PKCE is mandatory for X and good practice for Google. |
| 3 | Account identity key | `(provider, provider_user_id)` | Stable across email changes; X may not expose email. |
| 4 | Card mutation auth after linking | **Account *and* secret both work** | Preserves offline-first play + group handover; account is additive. |
| 5 | Scope | **Substrate only**, no aggregation/dashboard UI | Owner choice; keeps 05 at M and leaves the private list + public profile to later/09. |
| 6 | Auto-adopt cards by provider email | **No** | Provider email isn't proof of card ownership; secret-proven linking only. |
| 7 | Provider tokens | Not stored | Identity read once at callback; minimizes data + GDPR footprint. |

## Acceptance criteria

- A logged-out player can start login with Google **or** X and, after provider
  consent, return to `/` authenticated (a session cookie is set).
- Logging in the first time creates exactly one `accounts` row keyed on
  `(provider, provider_user_id)`; logging in again with the same provider identity
  reuses it (no duplicate).
- The session cookie is `HttpOnly; Secure; SameSite=Lax`; the DB stores only its
  SHA-256 hash; an expired session is treated as logged out.
- A callback with a missing/expired/replayed `state` is rejected and sets no
  session.
- The post-login redirect always lands on a same-origin path regardless of any
  request-supplied target (no open redirect).
- `link-card` sets `cards.account_id` only when the secret matches; a wrong secret
  leaves the row unchanged.
- A card created while logged in has `account_id` set at creation.
- `DELETE /api/account` removes the account and its sessions and nulls
  `account_id` on its cards; **the cards themselves still exist and remain
  verifiable**.
- With the Worker/D1 down or a provider error, login fails gracefully and the game
  remains fully playable; no client crash.
- `/privacidad` discloses Google + X as processors, the session cookie, and the
  account-deletion right; the "no cookies" claim is corrected.
- `npm run build` is green.

## Testing requirements

No test runner exists (`npm run build` is the gate). Verify manually + by
inspection:

- **Architecture/inspection:** no new `src/` top-level folder; no new runtime dep
  in `package.json`; new routes export `prerender = false`; server env only via
  `cloudflare:workers`; `link-card` uses a single guarded `UPDATE`.
- **Integration (local dev with provider sandbox/test apps):** walk each dev
  scenario below. OAuth needs real provider test credentials in `.dev.vars` and a
  `localhost` redirect URI registered with each provider.
- **Security review (mandatory this feature):** CSRF/state single-use, PKCE,
  cookie flags, open-redirect, no token persistence, secret re-check in SQL,
  rate-limit on `:provider/start` and callback.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `auth:google-login` | first Google sign-in creates account + session | "Continuar con Google" → consent → callback |
| `auth:x-login` | first X sign-in (no email from provider) | "Continuar con X" → consent → callback |
| `auth:returning` | same identity reused, no duplicate account | log out, log in again same provider |
| `auth:link-card` | local card linked by secret | post-login client links `localStorage` cards |
| `auth:create-logged-in` | new card stamped with `account_id` | create a cartón while logged in |
| `auth:logout` | session revoked + cookie cleared | "Cerrar sesión" |
| `auth:account-delete` | account gone, cards survive unlinked | `DELETE /api/account` |
| `auth:csrf` | bad/missing/replayed state rejected | hand-craft a callback with wrong `state` |
| `auth:open-redirect` | off-origin return target ignored | append a redirect param to the callback |
| `auth:degraded` | login fails, game still works | stop the Worker / force a provider 5xx |

## Phases

- **P0** — planning artifacts (this SPEC + `PLAN.md` + `TASKS.md`).
- **P1** — schema (`0011`) + `lib/auth.ts` session helpers + `oauth_state` + GC.
- **P2** — Google flow end-to-end (`start`/`callback`/`logout`) + session cookie.
- **P3** — X provider (PKCE) behind the same provider abstraction.
- **P4** — `link-card`, `account_id` stamping on card issue, `GET`/`DELETE`
  `/api/account`, minimal login/logout UI affordance + `api.ts` client methods.
- **P5** — `/privacidad` + `legal/README.md` updates; hardening + mandatory
  security review of the auth surface.
- **P6** — PR against `main`.

## Deploy & rollback

- **Provider setup (pre-deploy):** register an OAuth app with Google and with X;
  set redirect URIs `https://bingo.gruxon.com/api/auth/{google,x}/callback` (prod)
  and the `localhost:4321` equivalents (dev). Capture client id/secret.
- **Secrets:** `wrangler secret put GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET`.
  Local equivalents in `.dev.vars` (gitignored). Never in `wrangler.jsonc`.
- **Migration:** `0011_accounts.sql` applied via `npm run db:migrate` (remote) and
  `--local` for dev. Additive only — safe to deploy before the UI is exercised.
- **Rollback:** revert the PR. The added column/tables are inert if unused; no data
  cleanup required. If only the providers misbehave, the login affordance can be
  hidden without reverting the schema.

## Open questions / risks

- **X email absence** — accepted: `email` nullable; identity rests on
  `provider_user_id`. (RESOLVED by design.)
- **Cross-device linking of *old* cards** — on a fresh device with no
  `localStorage` secrets, pre-existing cards can't be linked in 05 (no
  auto-adopt-by-email). Acceptable for the substrate; email-recovery still works to
  regain the secret, after which linking applies. (DEFERRED enhancement.)
- **Brand-name hygiene** — "Continuar con Google/X" is functional auth UI, not
  editorial game copy; legally analogous to the vehicle-brand selector exception
  (`docs/legal/README.md`). Note for `brand-review`.
- **Provider/library temptation** — risk that an implementer reaches for an auth
  library; the SPEC forbids it. Flag in review.
- **Session fixation/rotation** — issue a fresh token per login; do not reuse.

## Deliverables

- `migrations/0011_accounts.sql`
- `src/lib/auth.ts`
- `src/pages/api/auth/[provider]/start.ts`, `…/callback.ts`, `src/pages/api/auth/logout.ts`
- `src/pages/api/account/index.ts` (GET/DELETE), `src/pages/api/account/link-card.ts`
- `POST /api/cards` change (stamp `account_id`)
- `src/lib/api.ts` client methods + minimal `index.astro` login affordance
- `/privacidad` + `docs/legal/README.md` updates
- `PLAN.md`, `TASKS.md`, and (during execution) `progress.md` / `decisions.md` /
  `testing.md` / `known-issues.md`

## Post-merge next feature

Unblocks `09 gallery-profiles` (public per-person profile + gallery counter) and
the cross-card tier of `06 achievements-badges`. A private "mis diplomas" dashboard
(the deferred aggregation UI) is the natural fast-follow on this substrate.
