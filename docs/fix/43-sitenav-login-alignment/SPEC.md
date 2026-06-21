# fix/43-sitenav-login-alignment

## Goal

Google and X login buttons used `.nav-box` (42×42px bordered glyph) while every
other nav item uses `.nav-action` (icon-over-label, 62px min-width). The mismatch
broke the uniform bottom-aligned stack and made the login area look detached from
the rest of the nav.

## Issue

`#43`

## Branch

`fix/32-sitenav-alignment`

## Root cause

`src/components/SiteNav.astro`: `btn-login-google` and `btn-login-x` were assigned
`.nav-box` and wrapped in a `flex-col` sub-div with a shared `<span>Jugar con
cuenta</span>` label — a layout holdover from the pre-design-system nav. The
`.nav-action` pattern (icon + nav-label, `min-width: 62px`, column flex) was
introduced in feature 14 for Hall and Vincular but not applied to the login buttons.

## Scope

### In scope

- `src/components/SiteNav.astro`: convert `btn-login-google` and `btn-login-x`
  from `.nav-box` to `.nav-action`; add individual `<span class="nav-label">`
  inside each; remove the wrapper `<div class="flex gap-1.5">` and the shared
  "Jugar con cuenta" label; resize SVGs from 20×16 to 24×24; change
  `account-loggedout` from `flex-col items-center gap-1.5 px-2 py-1` to
  `items-end gap-0.5`.

### Out of scope

- `.nav-box` CSS class itself — still used elsewhere; not removed.
- JS behavior (`classList.add/remove('flex')` on `account-loggedout`) — unchanged
  and verified compatible with new static classes.

## Impact

- Files touched: `src/components/SiteNav.astro` only.
- Blast radius: visual regression in the nav login area only. No JS paths changed;
  all IDs/aria hooks preserved verbatim.
- Detection: immediate on any deployment with `hasGoogle` or `hasX` true.

## Rules that must never be violated

- Every ID/aria attribute the page script relies on (`btn-login-google`,
  `btn-login-x`, `account-loggedout`, `aria-label`) must be preserved.
- `npm run build` must pass.

## Risks

- Security: n/a.
- Compliance: n/a.
- Visual: `aria-label="Jugar con Google/X"` + `title=` preserve intent for AT and
  hover; visible label now shows provider name ("Google", "X") rather than shared
  "Jugar con cuenta" — intentional design tradeoff, consistent with nav-action
  pattern.

## Acceptance criteria

- [ ] Google and X buttons render as `.nav-action` items aligned with Hall/Vincular.
- [ ] `aria-label="Jugar con Google"` / `"Jugar con X"` present.
- [ ] Hover `title` shows "Jugar con Google" / "Jugar con X".
- [ ] Account bar shows/hides correctly (JS `classList.add/remove('flex')`).
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>`. No data-side changes.

## Effort

XS — HTML/CSS only, one component file.
