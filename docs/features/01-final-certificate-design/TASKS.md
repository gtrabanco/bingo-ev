# 01 — final-certificate-design · TASKS

> Checklist expanded from `PLAN.md`. Check off as each lands; one commit per phase.

## P0 — Planning (this skill)

- [x] SPEC written and scoped (size M, scope + direction confirmed with user)
- [x] PLAN + TASKS generated
- [ ] Roadmap row registered as `in-progress` when execution starts
- [ ] Tracking issue opened; PR will carry `Closes #<issue>`

## P1 — Shared design module

- [x] Create `src/lib/certificate-design.ts` with `PALETTE`, `HONORIFICS`,
      shared copy constants, and font stacks
- [x] Move `HONORIFICS` out of `certificate.ts`; import from the new module
- [x] Replace inlined hexes in `certificate.ts` with `PALETTE`
- [x] `npm run build` green
- [ ] Visual check: downloaded PNG identical to pre-refactor
- [x] Commit `refactor(certificate): extract shared design tokens`

## P2 — Final PNG design

- [x] Elevate frame (double border + corner ornaments)
- [x] Render honorific as a rotated seal/stamp echoing `.expired-stamp`
- [x] Tighten type hierarchy + vertical rhythm; keep all content rows
- [x] Crisper QR seal corner (keep integer-module scaling)
- [x] Visual check: `sinverguenza` renders in preview — stamp + QR border visible
- [ ] Visual check: `resignado`, `granujilla` variants — manual browser check
- [ ] Visual check: empty-nick fallback path — manual browser check
- [x] `npm run build` green
- [x] Commit `feat(certificate): final diploma PNG design`

## P3 — OG parity

- [x] Rebuild `diplomaSvg` to match the PNG at 1200×630 (incl. honorific seal)
- [x] Remove the `fonts.googleapis.com` `@import`; use shared `SERIF` stack
- [x] `og/diploma/[id].svg.ts`: select `marks`, derive honorific via
      `honorificFor`, pass to `diplomaSvg`
- [x] Keep `escapeXml` on nick (and any new interpolated text)
- [x] Decide mini-QR on OG: omit (link-preview card; URL is the action)
- [x] Visual check: `/og/diploma/<id>.svg` returns 200 with honorific, frame,
      corner ornaments, seal, verify URL; no Google Fonts
- [x] Verify no `fonts.googleapis.com` remains anywhere
- [x] `npm run build` green
- [x] Commit `feat(og): diploma share card parity with final design`
- [ ] Visual check per-honorific: manual browser check at `/og/diploma/<id>.svg`

## P2 fixes (folded from review-change)

- [x] Fix typo `drawHonorifcSeal` → `drawHonorificSeal`
- [x] Remove unused `cardId` param from `drawVerificationQr`

## P4 — Feature A: unmark invalidation + lock

- [x] `src/lib/card.ts`: `MARKS_LOCK_HOURS = 24`, `marksLockAt`, `areMarksLocked`
- [x] `marks.ts` endpoint: fetch `completed_at`+`cells`; 409 if locked; clear
      `completed_at` when un-marked within grace breaks the bingo
- [x] `index.astro` `toggleCell`: block when locked (toast); invalidate +
      return to progress view when within grace
- [x] `index.astro`: render grid disabled when locked
- [x] `api.ts` `syncMarks`: handle 409 (revert + refetch)
- [x] `docs/domain/README.md`: rewrite "bingo sung stays sung" → grace/lock rules
- [ ] Verify `/v/<id>` shows in-progress when `completed_at` is NULL
- [x] `npm run build` green
- [ ] Manual: un-mark <24h voids diploma + OG 404; >24h grid locked + POST 409
- [x] Commit `feat(cards): invalidate/lock diploma on unmark`

## P5 — Feature A: 12-month retention GC

- [x] GC sweep: delete completed cards with `completed_at` > 12 months
- [x] Grouped expired-completed cards run `settleDeparture` (no dangling
      winner/owner); `orphanedOwnerRepair` backstop kept
- [x] Mirror sweep in `groups/index.ts` if cheap — not needed; `cards/index.ts`
      sweep is comprehensive (see decisions.md D6)
- [x] `docs/domain/README.md`: document 12-month completed retention
- [x] `npm run build` green
- [ ] Manual: old completed card (grouped + ungrouped) in local D1 is swept on
      next card issue; group settled
- [x] Commit `feat(cards): 12-month retention for completed cards`

## P6 — Feature B: Turnstile

- [ ] `src/lib/turnstile.ts`: `verifyTurnstile(token, ip)` (fail closed)
- [ ] Gate `POST /api/cards`, `/api/recover`, `/api/groups`,
      `/api/groups/[id]/join` (403 on bad token)
- [ ] Client widget in issue/recover (`index.astro`) + create/join (`g/[id].astro`)
- [ ] `api.ts`: attach `cf-turnstile-response` on the 4 gated calls
- [ ] `wrangler.jsonc`: Turnstile site key (public var); secret via
      `wrangler secret put TURNSTILE_SECRET_KEY` + `.dev.vars`
- [ ] `privacidad.astro` + `docs/legal/README.md`: Turnstile disclosure (cookieless)
- [ ] `npm run build` green
- [ ] Manual: gated endpoints reject missing/garbage token; happy path works
- [ ] Commit `feat(security): Turnstile on creation/email endpoints`

## P7 — Feature B: rate-limiting

- [ ] `wrangler.jsonc`: Workers Rate Limiting binding
- [ ] `src/lib/rate-limit.ts`: per-IP (`cf-connecting-ip`) check, degrades open in dev
- [ ] Apply to all write endpoints; 429 on exceed; tighter on issue/recover/create
- [ ] `api.ts`: surface 429 without breaking offline-first
- [ ] `docs/infrastructure/README.md`: document WAF rate-limit rules
- [ ] `npm run build` green
- [ ] Manual: loop a write past the limit → 429; normal play never trips it
- [ ] Commit `feat(security): per-IP rate limiting on writes`

## P8 — PR

- [ ] One PR to `main` (no originating issue → no `Closes`)
- [ ] Flip roadmap row `01` to `done`
- [ ] Companion reviews per CLAUDE.md: design, brand, web-perf, SEO,
      **security-review**, accessibility
