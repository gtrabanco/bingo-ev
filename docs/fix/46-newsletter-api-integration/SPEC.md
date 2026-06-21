# fix/46-newsletter-api-integration

## Goal

Newsletter opt-ins were stored in a local D1 table that was never read or exported,
providing no actual newsletter delivery. Replace with `@gtrabanco/newsletter`
(double opt-in, Workers-safe) and drop the dead table.

## Issue

`#46`

## Branch

`fix/newsletter-api-integration`

## Root cause

`migrations/0004_newsletter.sql` + `src/pages/api/cards/[id]/email.ts:49-56` (main):
`INSERT OR IGNORE INTO newsletter` stored opt-ins locally. The integration with the
central newsletter service was deferred when the API docs returned 403; the deferral
never resolved, leaving the table as a dead-end sink.

## Scope

### In scope

- Install `@gtrabanco/newsletter@0.1.1` (pinned, zero deps, Workers-safe).
- `src/pages/api/cards/[id]/email.ts`: replace `INSERT INTO newsletter` with
  `client.subscribe()` inside a 4 s `Promise.race` timeout (best-effort; never
  blocks card save; skipped when `NEWSLETTER_API_KEY` absent).
- `migrations/0015_drop_newsletter_table.sql`: `DROP TABLE IF EXISTS newsletter`.
- `src/pages/index.astro`: update success message to reflect double opt-in
  ("Confirma la suscripción en el correo que te enviamos.").
- `worker-configuration.d.ts`: add `NEWSLETTER_API_KEY: string` to `__BaseEnv_Env`.
- `CLAUDE.md`: document `@gtrabanco/newsletter` as approved runtime dependency.

### Out of scope

- Privacy page (`privacidad.astro`) copy: the central newsletter service is not yet
  named as a processor. Tracked in #48.
- `ctx.waitUntil` for fire-and-forget: not accessible under `@astrojs/cloudflare` v13;
  the `Promise.race` timeout achieves an equivalent ceiling. Tracked in #49.

## Impact

- Files touched: `src/pages/api/cards/[id]/email.ts`, `src/pages/index.astro`,
  `worker-configuration.d.ts`, `CLAUDE.md`, `package.json`, `package-lock.json`,
  `migrations/0015_drop_newsletter_table.sql`.
- Blast radius: subscribe failure never blocks the 204 response (best-effort + timeout).
- Detection: absent `NEWSLETTER_API_KEY` in prod → silent skip, no error logged; a
  deploy without the secret set would silently stop sending confirmation emails.

## Rules that must never be violated

- `import { env } from 'cloudflare:workers'` — already in place.
- `export const prerender = false` — already in place.
- No new runtime deps without explicit CLAUDE.md approval — updated.
- Secrets via `wrangler secret put` only — `NEWSLETTER_API_KEY` already in prod.

## Risks

- Security: n/a — email is already validated before reaching the subscribe call.
- Compliance: existing opt-in records in D1 dropped by migration 0015 (no real users
  — all data is owner test data; consciously discarded).
- Compliance: `privacidad.astro` does not yet name the central newsletter service as
  processor. Low-risk while user base is zero; tracked in #48.

## Acceptance criteria

- [ ] Checking the newsletter box and saving triggers a double opt-in confirmation
  email at the address entered (verify in production).
- [ ] Success message reads "Cartón guardado. Confirma la suscripción en el correo
  que te enviamos." when newsletter was selected.
- [ ] Without `NEWSLETTER_API_KEY` set (dev), the subscribe call is skipped silently
  and the card saves successfully.
- [ ] A hung newsletter API does not stall the card-save response beyond 4 s.
- [ ] `newsletter` table is absent after migration 0015 runs.
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>`. Re-apply migration to recreate the table if needed (data was
test-only). Remove `NEWSLETTER_API_KEY` secret is not required — the guard skips
gracefully when the key is absent.

## Effort

S — two-file code change + migration + deps + docs.
