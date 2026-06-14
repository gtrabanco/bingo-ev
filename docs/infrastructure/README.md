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

## Operational concerns

- **No new runtime dependencies** beyond Astro + Tailwind + `uqr`.
- **Best-effort API**: `src/lib/api.ts` bounds every call to 4 s (`AbortSignal.timeout`)
  and returns `null`/`false` on failure.
- **Concurrency**: group/card mutations re-check state inside the SQL (atomic claims and
  guarded `UPDATE`s), never read-then-write. CSRF is covered by Astro's `checkOrigin`.
- **No analytics/advertising cookies**; localStorage is strictly necessary (no cookie
  banner). Worker observability is enabled in `wrangler.jsonc`.
