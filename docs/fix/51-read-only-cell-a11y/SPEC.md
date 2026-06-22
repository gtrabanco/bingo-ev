# fix/51-read-only-cell-a11y

## Goal

Read-only card cells in `/c/{id}` and `/v/{id}` carry `aria-pressed` on plain
`<div>` elements. `aria-pressed` requires an implicit/explicit `button` role to be
meaningful; screen readers ignore or misinterpret it on generic divs. The mark
state (suffered / caused) is conveyed only by dab color, giving AT users no way to
read which situations were marked or how.

## Issue

`#51`

## Branch

`fix/51-read-only-cell-a11y`

## Root cause

`src/pages/c/[id].astro:125` and `src/pages/v/[id].astro:181` — the read-only
cell div carries `aria-pressed={marks[index] ? 'true' : 'false'}`, copied from
the interactive game's `<button aria-pressed>` pattern without adapting to the
non-interactive read-only context.

## Scope

### In scope

- **`src/pages/c/[id].astro`** and **`src/pages/v/[id].astro`**: for each
  non-blank cell, replace `aria-pressed` with `role="img"` and an `aria-label`
  that includes both the situation text and the mark-state label
  (`"sin marcar"` / `"sufrida"` / `"causada"`). Keep `data-kind` (CSS relies
  on it for dab color) and `aria-hidden="true"` on `.dab`.
- **`docs/frontend/ACCESSIBILITY.md`**: update the semantics note to document
  the read-only cell pattern alongside the interactive pattern.
- **`src/styles/global.css`**: add `.cell[data-kind='1']/.cell[data-kind='2'] .dab`
  visibility rule so dabs render on read-only views after `aria-pressed` removal
  (the original `aria-pressed` selector was the sole show-rule; `data-kind` is the
  correct data signal for read-only cells). Harmless for interactive game cells.

### Out of scope

- Interactive game cells in `src/pages/index.astro`: those are `<button
  aria-pressed>` and are correct — do not touch.
- The `kick "echar"` button accessible-name gap (#18): tracked separately.

## Impact

- Files touched: `src/pages/c/[id].astro`, `src/pages/v/[id].astro`,
  `docs/frontend/ACCESSIBILITY.md`, `src/styles/global.css`.
- Blast radius: read-only view only. No write path, no server logic.
- Detection: visible in accessibility-tree audit (no automated CI gate).

## Rules that must never be violated

- `export const prerender = false` — already in place on both pages.
- No new runtime dependencies.
- `data-kind` attribute must be preserved (CSS `.cell[data-kind='2'] .dab` rule
  in `global.css` relies on it).

## Risks

- Security: n/a — read-only, no input.
- Compliance: this fix improves WCAG 2.1 AA conformance; no regression risk.

## Acceptance criteria

- [ ] In `/c/{id}` and `/v/{id}`, each non-blank cell has `role="img"` and an
  `aria-label` of the form `"{situation text} — sufrida"` / `"— causada"` /
  `"— sin marcar"` as appropriate.
- [ ] `aria-pressed` no longer appears on any cell `<div>` in either page.
- [ ] `data-kind` attribute is still present on each non-blank cell (CSS test:
  dab colors still render correctly in-browser).
- [ ] Interactive game cells in `index.astro` are unchanged.
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — no data-side impact.

## Effort

XS — two-file markup change + doc note, zero logic.
