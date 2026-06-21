# fix/33-remove-integration-package

## Goal

Delete the `docs/features/14-design-refactor-design-system/integration/` directory.
It was the reference package that seeded feature 14 and is fully superseded now that
the PR has merged: all source files are in `src/`, OFL licenses are in `public/fonts/`,
and the OG-subset TTF work is complete with the subset woff2s committed.

## Issue

`#33` — tech-debt: remove integration/ package after feature 14 merges.

## Branch

`fix/33-remove-integration-package`

## Root cause

The `integration/` directory was committed as a design-system hand-off package for
feature 14 planning. It contains copies of files that have since been integrated:
- `src/components/BingoCard.astro`, `SiteNav.astro`, `src/styles/global.css` →
  now canonical in `src/`
- `public/fonts/*.ttf` (5 source fonts) → subsetting done (S8); subset woff2s
  committed in `public/fonts/`; regeneration commands documented in `src/lib/og-fonts.ts`
- `public/fonts/*-OFL.txt` (3 licenses) → duplicates of `public/fonts/*.txt`
- `INTEGRATION.md` → setup guide, all decisions captured in `decisions.md`

Risk of keeping: silent drift between reference copies and production files.

## Scope

### In scope

Delete `docs/features/14-design-refactor-design-system/integration/` entirely
(tracked files via `git rm -r`, untracked woff2s via `rm`).

### Out of scope

No changes to `src/`, `public/`, or any other feature doc. The OFL licenses in
`public/fonts/` are the canonical copies — untouched.

## Impact

- Files removed: 12 tracked files + 5 untracked woff2s. No production code paths
  affected — all referenced from `src/`, not `integration/`.
- Blast radius: zero runtime impact. Docs-only deletion.
- Detection: immediately visible in the repo tree; `npm run build` would catch any
  inadvertent breakage.

## Rules that must never be violated

- Gate green (`npm run build`) before commit.
- Branch off `main`; one PR.

## Risks

- n/a — no code changes, no schema changes, no secrets touched.

## Acceptance criteria

- [ ] `docs/features/14-design-refactor-design-system/integration/` does not exist
  in the repo after the PR merges.
- [ ] `npm run build` green.
- [ ] `public/fonts/*.txt` OFL licenses still present (untouched canonical copies).
- [ ] `src/components/BingoCard.astro`, `SiteNav.astro`, `src/styles/global.css`
  still present in `src/` (untouched).

## Rollback

`git revert <commit>` restores the tracked files. Untracked woff2s would need to
be regenerated from the TTFs (source available via Google Fonts; commands in
`src/lib/og-fonts.ts`).

## Effort

XS — single `git rm -r` + `rm` for the untracked woff2s.
