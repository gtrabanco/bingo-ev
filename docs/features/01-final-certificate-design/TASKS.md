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

## P4 — PR

- [ ] One PR to `main`, body `Closes #<issue>`
- [ ] Flip roadmap row `01` to `done`
- [ ] Companion reviews per CLAUDE.md (design-review, brand-review, web-perf, SEO)
