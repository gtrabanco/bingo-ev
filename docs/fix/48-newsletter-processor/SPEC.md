# fix/48-newsletter-processor

## Goal

After fix/46 merged (`@gtrabanco/newsletter` double opt-in), newsletter
opt-in data is now processed by the central newsletter service at
`gtrabanco.com` — not in the project's own D1. The privacy page
(`/privacidad`) only names Brevo as a processor (for transactional email)
and does not mention the newsletter service at all. GDPR transparency
requires naming all processors; this fix adds that sentence before the
user base grows beyond test data.

## Issue

`#48`

## Branch

`fix/48-newsletter-processor`

## Root cause

`src/pages/privacidad.astro:94-106` — the "Cuánto tiempo y con quién"
section was written when newsletter data lived in D1 (no third-party
processor). Fix/46 moved newsletter opt-ins to `gtrabanco.com`
(`baseUrl` in `src/pages/api/cards/[id]/email.ts:54`), but the privacy
page was not updated.

## Scope

### In scope

- **`src/pages/privacidad.astro`**: in the "Cuánto tiempo y con quién"
  section, add a sentence naming `gtrabanco.com` as the processor for
  newsletter opt-in data, alongside the existing Brevo mention.

### Out of scope

- `docs/legal/README.md` still says "the newsletter list lives in the
  project's own D1 — not a third party", which is stale after fix/46.
  That doc update should be a follow-on; it doesn't block the legal
  disclosure to users. File separately.
- Any change to how opt-in data is collected or stored.

## Impact

- Files touched: `src/pages/privacidad.astro`.
- Blast radius: static copy only; no logic, no data path.
- Detection: visible on `/privacidad`; no automated gate catches stale
  privacy copy.

## Rules that must never be violated

- UI strings in Spanish (es-ES); docs/code in English.
- No new runtime dependencies.
- `export const prerender` is not on this page — it's a static Astro
  page, no dynamic route concern.

## Risks

- Legal: naming the processor is the right direction; not naming it is
  the risk. No data-side impact.
- Security: n/a — static copy change.

## Acceptance criteria

- [ ] `/privacidad` names `gtrabanco.com` as the processor for newsletter
  opt-in data in the "Cuánto tiempo y con quién" section.
- [ ] Brevo mention is unchanged (still named as processor for
  transactional email).
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — no data-side impact.

## Effort

XS — single sentence added to static copy.
