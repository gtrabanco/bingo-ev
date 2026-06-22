# fix/54-legal-readme-newsletter-stale

## Goal

`docs/legal/README.md` contains three stale statements about the newsletter
opt-in flow, left over from before fix/46 (PR #47) replaced the D1
`newsletter` table with `@gtrabanco/newsletter`. The internal doc is the
reference authoritative source for legal/privacy decisions; stale claims here
can mislead future developers and contradict the now-correct public
`/privacidad` page (corrected in PR #53).

## Issue

`#54`

## Branch

`fix/54-legal-readme-newsletter-stale`

## Root cause

`docs/legal/README.md` was not updated when fix/46 merged. Three bullets are
now wrong:

1. **Line 17**: "`consented_at` records the timestamp" — the `consented_at`
   column lived in the D1 `newsletter` table (migration `0004_newsletter.sql`),
   which was dropped by migration `0015_drop_newsletter_table.sql`. The column
   no longer exists. The `cards` table retains a `newsletter` boolean, but no
   timestamp.

2. **Line 18**: "No confirmation email is sent — the form is the confirmation"
   — fix/46 introduced double opt-in via `@gtrabanco/newsletter`; a
   confirmation email IS now sent automatically on subscribe
   (`src/pages/api/cards/[id]/email.ts:49-65`).

3. **Lines 25–26**: "The newsletter list lives in the project's own D1
   (`newsletter` table), not a third party" — migration 0015 dropped that
   table; the list is now managed externally at gtrabanco.com.

## Scope

### In scope

- **`docs/legal/README.md`**: correct the three stale bullets described above.

### Out of scope

- No code changes. The `cards` table schema, the email endpoint, and
  `/privacidad` are already correct.
- The `cards.newsletter` boolean column (tracks the user's opt-in preference
  at registration time) is correct and is not in scope.

## Impact

- Files touched: `docs/legal/README.md`.
- Blast radius: doc only; no runtime impact.
- Detection: not automated; caught manually during privacy/legal review.

## Rules that must never be violated

- Docs in English.
- No code changes in this fix.

## Risks

- Compliance: correcting the doc reduces risk; no new risk introduced.
- Security: n/a.

## Acceptance criteria

- [ ] Line 17: `consented_at` reference removed; replaced with accurate
  description (cards store a `newsletter` boolean, no timestamp).
- [ ] Line 18: "No confirmation email" claim removed; replaced with accurate
  description (double opt-in confirmation email sent by gtrabanco.com).
- [ ] Lines 25–26: "lives in own D1" claim corrected to reflect external
  management at gtrabanco.com; `newsletter` table noted as dropped.
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — doc only, no data impact.

## Effort

XS — doc-only, single file.
