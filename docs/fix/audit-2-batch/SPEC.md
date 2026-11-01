# fix/audit-2-batch

> Batch fix unit folding the five `fix-now` findings that product audit 2
> (`docs/audits/2-2026-11-01.md`) triaged into open issues. Lighter than a
> feature spec — no planning artifacts. The SPEC alone is the source of truth.

## Goal

Restore every process artifact and dependency declaration that audit 2 found
lying, and close the one security gap it found: the account endpoints that mutate
or destroy user data carried no rate-limit binding. Four of the five repairs are
documentation/dependency truth-restoration; the fifth adds the same
`checkRateLimit` guard every other write route already uses. They ship together
because each is a small, independent, one-commit repair whose rollback boundary
is the whole batch — there is no shared runtime state and no ordering
dependency between them.

## Issue

Batch — closes five tracked issues, each with its own `Closes #<n>` line in the
PR:

- `#81` — `docs/fix/README.md` table is 100% stale (17 rows, all closed issues)
- `#82` — `docs/CAPABILITIES.md` declares Authentication `no` while accounts ship
- `#84` — four stray production dependencies outside the closed catalog
- `#85` — roadmap rows 06/07 claim `planned` with no SPEC or planning artifacts
- `#90` — `DELETE /api/account` and `POST /api/account/profile` are unrate-limited

## Branch

`fix/audit-2-batch`

## Root cause

Each finding has its own root cause; they share only the audit that surfaced
them.

- **#81** — the fix workflow's "remove the row when the PR merges" step is a
  habit, not an enforced check, so 17 closed units accumulated.
- **#82** — `docs/CAPABILITIES.md` was seeded before feature 05 and never
  extended when the accounts subsystem landed.
- **#84** — agent tooling was installed in the wrong `package.json` section
  during harness setup; nothing in `src/` imports it.
- **#85** — two roadmap rows were written with an optimistic status before any
  SPEC existed.
- **#90** — the account routes were added before the rate-limit helper was
  adopted as the standard guard for every write route.

## Scope

### In scope

- `docs/fix/README.md` — delete all 17 stale rows; re-register this batch as the
  only open unit.
- `docs/CAPABILITIES.md` — `Authentication` → `partial` with real entry points;
  `ACL / permissions` → `partial` with the AD-004 rule; add the
  authenticated-account role.
- `package.json` + `package-lock.json` + `bun.lock` — drop `@joemccann/pi-pdf`,
  `pi-subagents`, `version`, `view`.
- `docs/features/ROADMAP.md` — rows 06 and 07 → `idea` (the state their artifacts
  support).
- `src/pages/api/account/index.ts` — rate-limit `DELETE`.
- `src/pages/api/account/profile.ts` — rate-limit `POST`.
- `docs/workflow/REPOSITORY_STATE.md` — close OQ-001.

### Out of scope

- The three remaining audit-1 issues and the five postponed audit-2 issues
  (#35, #83, #86, #87, #88, #89) — each keeps its own issue and route.
- `POST /api/account/link-card.ts` and `DELETE /api/account/card/[id]` — no
  rate-limit gap was recorded for them; folding them would be scope creep beyond
  the citing finding.
- Dependency version bumps (#89) — deliberately separate so this batch's diff
  stays purely subtractive on `package.json`.

## Impact

- Modules touched: 2 API routes, 1 dependency manifest, 3 documentation files,
  1 fix index, 1 frozen-state ledger.
- Blast radius: the rate-limit guards fail open when the binding is absent, so a
  misconfiguration degrades to today's behaviour rather than breaking account
  deletion. The dependency removal is verified by the build.
- Detection lead time: immediate — `npm run build` type-checks both edited
  routes.

## Rules that must never be violated

- **Closed runtime-dependency catalog** (AI-007 class / CLAUDE.md hard
  conventions): after this fix the catalog is exactly Astro + Tailwind + `uqr` +
  `@gtrabanco/newsletter` + `@resvg/resvg-wasm` + tooling (`wrangler`,
  `@tailwindcss/vite`, `@astrojs/cloudflare`).
- **`settleDeparture` on every card removal** — untouched; only the guard is
  added around `DELETE`, the deletion body is unchanged.
- **Server env access via `import { env } from 'cloudflare:workers'`** — kept.
- **`export const prerender = false` on dynamic routes** — kept.
- **Docs in English** — all edited documentation is English.

## Risks

- *Security*: the guard is placed **after** the session check, so unauthenticated
  callers still receive the cheap 401 and cannot burn the limit budget of a
  legitimate shared IP. Reusing the existing `RATE_LIMITER_WRITE` binding adds no
  new wrangler namespace.
- *Operational*: no migration, no schema change, no new binding.
- *Compliance*: GDPR erasure stays reachable; the limit is per IP per minute, far
  above any human retry rate.

## Acceptance criteria

- [ ] `docs/fix/README.md` lists exactly one row, and it is this batch.
- [ ] `docs/CAPABILITIES.md` `Authentication` reads `partial` and cites
      `src/pages/api/auth/*`; the Roles table has the authenticated-account row.
- [ ] `package.json` `dependencies` contains no package that `src/` does not
      import; `npm ls --depth=0` reports no stray direct dep.
- [ ] `docs/features/ROADMAP.md` rows 06/07 read `idea`; no row claims `planned`
      without a folder.
- [ ] Both account routes call `checkRateLimit('RATE_LIMITER_WRITE', …)` before
      their first DB write.
- [ ] `npm run build` exits 0.

## Rollback

`git revert` the batch commit. No data-side cleanup: no migration ran, no rows
were written, no binding was added.

## Effort

S — five independent one-purpose edits, two of which are single-line guards. The
volume is in the fix-index and capabilities rewrites, both mechanical.

## Batch note

The repository's fix convention is one folder per issue,
`docs/fix/<issue-number>-<topic>/`. This unit deliberately deviates: five triaged
`fix-now` findings were batched into one branch and one PR at the owner's explicit
request (2026-11-01), so the folder is named `audit-2-batch` rather than after a
single issue. The five `Closes #<n>` lines in the PR body preserve the
issue ↔ fix traceability the naming convention exists to provide.
