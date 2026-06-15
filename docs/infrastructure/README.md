# Infrastructure

## Runtime & deployment

- **Astro 6 + `@astrojs/cloudflare` v13** on **Cloudflare Workers**. Static homepage +
  a small server side (API routes, server-rendered pages). Tailwind 4 via the Vite
  plugin. Site origin: `https://bingo.gruxon.com`.
- **Worker config** in `wrangler.jsonc` (name `bingo-ev`, D1 binding `DB`, assets binding
  `ASSETS`, observability on). The build emits the final Worker config to
  `dist/server/wrangler.json`; wrangler picks it up via `.wrangler/deploy/config.json`.
  The adapter's `SESSION` KV is auto-provisioned on deploy.
- **Deploy** is git-connected (Cloudflare Workers Builds): build `npm run build`, deploy
  `npm run deploy` → `wrangler d1 migrations apply ev-bingo --remote` (idempotent) then
  `wrangler deploy`. Schema ships with every push.
- **Server env access**: `import { env } from 'cloudflare:workers'` only. `locals.runtime.env`
  is removed in adapter v13 and throws. Never add a manual `src/env.d.ts`.
- **Every dynamic route** must `export const prerender = false;`.

## Storage & data

- **Cloudflare D1** (SQLite), binding `DB`, database `ev-bingo`. Two tables: `cards` and
  `groups`. Schema grows by additive migrations in `migrations/` (`0001`–`0008`); read
  them in order for the current shape.
- **Migrations**: `npm run db:migrate` applies to **remote**; for local dev run
  `npx wrangler d1 migrations apply ev-bingo --local` (the dev server needs the local DB
  to exist, and new columns won't appear in dev until applied).
- **House rule — tiny tables**: regenerated/expired never-completed cards are DELETED;
  completed cards are immune (their row makes a diploma verifiable). Card issue and group
  create each run an **opportunistic GC** in the same batch (no cron); the GC backstops
  group ownership via `orphanedOwnerRepair`.
- **Client storage**: `localStorage`, keys prefixed `evbingo.*` (`currentCardId`,
  `card.<id>`, `nick`, `alias`, `markMode`, `newsletter`). All access try/catch-guarded;
  private browsing falls back to in-memory play.

## External systems

- **Brevo** (transactional email) — *only* the recovery email; best-effort. With no
  config the game runs and recovery no-ops. `BREVO_API_KEY` is a secret
  (`npx wrangler secret put BREVO_API_KEY`, never in `wrangler.jsonc`); `BREVO_SENDER_EMAIL`
  / `BREVO_SENDER_NAME` are vars. Local dev reads them from `.dev.vars` (gitignored).
  Code in `src/lib/brevo.ts`.
- **Newsletter** sign-ups go to this site's own D1 `newsletter` table (`email`, `source`,
  `consented_at`) — **not** pushed to Brevo. `source` is the origin host so the list can
  be consolidated later. No confirmation email (the form is the confirmation).
- **uqr** (~3 KB) draws the diploma's verification QR — the only third-party runtime dep.

## Anti-abuse layer

Two complementary defences, both degrade open in dev (binding absent → pass-through):

### Cloudflare Turnstile (P6)

Cookieless bot challenge on the four creation/email endpoints: `POST /api/cards`,
`POST /api/recover`, `POST /api/groups`, `POST /api/groups/[id]/join`. Fail-closed
when `TURNSTILE_SECRET_KEY` is set; degrade open when absent (local dev). Site key is
a build-time env var (`PUBLIC_TURNSTILE_SITE_KEY` in `.env`, never wrangler vars — see
`decisions.md` D7). Secret via `wrangler secret put TURNSTILE_SECRET_KEY`.

### Workers Rate Limiting (P7)

Two per-IP rate limit tiers, declared as `unsafe.bindings` in `wrangler.jsonc`:

| Binding | Limit | Endpoints |
|---|---|---|
| `RATE_LIMITER_CREATE` | 10 req / 60 s | `POST /api/cards`, `POST /api/recover`, `POST /api/groups`, `POST /api/groups/[id]/join` |
| `RATE_LIMITER_WRITE` | 120 req / 60 s | All other write endpoints (marks sync, complete, alias, email, delete card/group, leave/kick) |

Rate check runs **before** Turnstile on creation endpoints (binding call is cheaper than
the external Turnstile HTTP round-trip). Helper in `src/lib/rate-limit.ts`; always
returns `true` when the binding is absent so local dev is never blocked. 429 responses
degrade gracefully in the client (`api.ts` returns `{ ok: false, error: 'ratelimited' }`
for group creation/join; fire-and-forget writes silently swallow the error per the
offline-first contract).

### WAF rules (Cloudflare dashboard)

Complementary to the binding-level rate limits, add these rules in the Cloudflare WAF
(Zone → Security → WAF → Rate limiting rules) for edge-layer protection before the
Worker starts:

- **Card/group creation burst**: 15 req / 60 s per IP on `POST /api/cards`,
  `POST /api/groups`, `POST /api/recover` → Block (mirroring the Worker binding with
  a slightly higher ceiling to absorb timing skew).
- **Write burst**: 150 req / 60 s per IP on `POST|DELETE /api/*` → Managed Challenge.

These are belt-and-suspenders: the Worker binding fires first if the request reaches
the Worker; the WAF rule may fire earlier at the edge.

## Operational concerns

- **No new runtime dependencies** beyond Astro + Tailwind + `uqr`.
- **Best-effort API**: `src/lib/api.ts` bounds every call to 4 s (`AbortSignal.timeout`)
  and returns `null`/`false` on failure.
- **Concurrency**: group/card mutations re-check state inside the SQL (atomic claims and
  guarded `UPDATE`s), never read-then-write. CSRF is covered by Astro's `checkOrigin`.
- **No analytics/advertising cookies**; localStorage is strictly necessary (no cookie
  banner). Worker observability is enabled in `wrangler.jsonc`.
