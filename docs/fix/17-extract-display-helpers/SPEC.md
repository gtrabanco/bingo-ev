# fix/17-extract-display-helpers

## Goal

`VEHICLE_LABELS` and `formatDate(iso)` are defined identically in three places —
`src/pages/hall-of-fame.astro` (SSR frontmatter), `src/pages/hall-of-fame.astro`
(client `<script>`), and `src/pages/jugador/[handle].astro` (SSR frontmatter).
Extract both into `src/lib/display.ts` so any future change to vehicle labels or
the es-ES date format only requires editing one file.

## Issue

`#17`

## Branch

`fix/17-extract-display-helpers`

## Root cause

Both constants were written per-file (originally `galeria.astro`, now
`hall-of-fame.astro`) and duplicated again when `jugador/[handle].astro` was
added in feature 09. No shared display helper existed.

## Scope

### In scope

- **`src/lib/display.ts`** (new file): export `VEHICLE_LABELS` and `formatDate`.
- **`src/pages/hall-of-fame.astro`**: remove the two inline definitions (SSR
  frontmatter + client script); import both from `../lib/display`.
- **`src/pages/jugador/[handle].astro`**: remove the two inline definitions;
  import both from `../../lib/display`.

### Out of scope

- `src/lib/certificate.ts` has its own `formatDate(date: Date)` (takes a `Date`,
  not an ISO string, different signature and purpose) — not touched.
- The local `FALLBACK_NICK` re-declaration in the `hall-of-fame.astro` client
  script is a separate issue; not touched here.
- No change to the labels' values or the locale options.

## Impact

- Files touched: `src/lib/display.ts` (new), `src/pages/hall-of-fame.astro`,
  `src/pages/jugador/[handle].astro`.
- Blast radius: vehicle-type labels and date display in the gallery and player
  profile pages. A wrong change breaks label rendering in both pages.
- Detection: visual — labels or dates render blank/wrong in the browser.

## Rules that must never be violated

- No new runtime dependencies (`Intl` is a browser/Worker built-in).
- Flat architecture: new file in `src/lib/`, not a subdirectory.
- No code comments except for non-obvious WHY.
- `src/lib/display.ts` must not import from pages, components, or outer layers.

## Risks

- Security: n/a.
- Compliance: n/a.
- Behavior regression: `VEHICLE_LABELS` values and `formatDate` locale options
  must be byte-identical to the removed copies.

## Acceptance criteria

- [ ] `src/lib/display.ts` exists and exports `VEHICLE_LABELS` (17-entry Record)
  and `formatDate(iso: string): string` (es-ES, day/month/year).
- [ ] `hall-of-fame.astro` SSR frontmatter imports `VEHICLE_LABELS` and
  `formatDate` from `../lib/display`; inline definitions removed.
- [ ] `hall-of-fame.astro` client `<script>` imports `VEHICLE_LABELS` and
  `formatDate` from `../lib/display`; inline definitions removed.
- [ ] `jugador/[handle].astro` imports `VEHICLE_LABELS` and `formatDate` from
  `../../lib/display`; inline definitions removed.
- [ ] No change to label values or locale options — output byte-identical.
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — pure refactor, no data or runtime impact.

## Effort

S — four sites to update, all mechanical.
