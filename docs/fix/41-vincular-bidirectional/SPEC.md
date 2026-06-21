# fix/41-vincular-bidirectional

## Goal

«Vincular» was only shown when a card with a secret existed in localStorage, making
it invisible on any new device. Users who started playing on one device (e.g. car
infotainment) had no visible entry point to import their card onto a second device.
Fix by making the button always visible and giving it two modes: import (no card)
and export (has card).

## Issue

`#41`

## Branch

`fix/vincular-bidirectional`

## Root cause

`src/pages/index.astro:1015` (main branch): `deviceCodeBtn?.classList.toggle('hidden', !card.id || card.secret === null)` hid the button unless a card with a secret was present. The device-code-panel had no import state — it only knew how to generate an outgoing code.

## Scope

### In scope

- `src/components/SiteNav.astro`: remove `hidden` from `device-code-btn` initial
  class so it renders visible on all page loads.
- `src/pages/index.astro` (HTML): split `device-code-panel` into two sub-divs:
  `#device-code-no-card` (import instructions + link to `/activar`) and
  `#device-code-has-card` (existing code generator, unchanged).
- `src/pages/index.astro` (JS): add refs to both sub-divs (using `$`); remove
  the visibility toggle from the card-render function; update click handler to
  open the panel unconditionally and then branch on `card.id && card.secret`.

### Out of scope

- `/activar` page itself — unchanged.
- The close/reopen state-reset: on re-open, branch logic reruns and immediately
  corrects sub-panel visibility. No user-visible flash; not worth a dedicated reset.

## Impact

- Files touched: `src/components/SiteNav.astro`, `src/pages/index.astro`.
- Blast radius: Vincular button is now always visible; clicking without a card
  shows import instructions instead of doing nothing. No API calls made in the
  no-card path.
- Detection: visible on any page load regardless of card state.

## Rules that must never be violated

- `device-code-btn` ID and `aria-controls="device-code-panel"` must be preserved.
- No new runtime dependencies.
- `npm run build` must pass.

## Risks

- Security: n/a — no API called in the no-card path.
- UX: import link must be visually distinguishable as a link (not color-only —
  WCAG 1.4.1). Addressed: `underline decoration-amber-300/40` added to the anchor.

## Acceptance criteria

- [ ] «Vincular» visible in nav on a fresh page with no card in localStorage.
- [ ] Click without card → panel opens with import instructions and `/activar` link.
- [ ] Click with card → panel opens with code generator (existing behaviour).
- [ ] `/activar` link is underlined (not color-only).
- [ ] Close button / second click closes panel correctly.
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>`. No DB changes; button reverts to card-conditional visibility.

## Effort

XS — HTML restructure + ~10 JS lines changed.
