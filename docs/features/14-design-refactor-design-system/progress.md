# 14 — progress

Running log. One entry per slice as it lands (what changed, what was verified, what
it left open for the next slice). Newest at the bottom.

## P0 — planning (this commit)

- Read the authored package (`integration/`): `INTEGRATION.md`, `global.css`,
  `BingoCard.astro`, `SiteNav.astro`, 5 fonts + 3 OFL licenses.
- Ran an exhaustive discovery (parallel readers + synthesis) over the current site:
  shell/font wiring, home nav + DOM-script hooks, 9 secondary pages, diploma/OG
  renderers + design docs.
- **Verified the nav swap is release-safe:** `comm -23` of the old nav's 21 DOM ids
  vs SiteNav's ids is empty; `data-has-providers` + `aria-controls=device-code-panel`
  preserved.
- Owner decisions captured (D2 whole-site, D3 diploma+OG fonts now, D4 home
  restructure). Sized `L`, sliced into S1–S8.
- Wrote SPEC / PLAN / TASKS / testing / known-issues / decisions; registered ROADMAP
  row 14.
- **Note:** GitHub issue #14 is unrelated (an a11y ticket) — feature 14 carries **no**
  `Closes #14`. Feature numbers and issue numbers are separate namespaces here.

_No code yet — planning is docs-only. Next: `execute-phase 14 S1`._

## S1 — Fonts + global.css foundation
_(pending)_

## S2 — Drop "BINGO" from cartón
_(pending)_

## S3 — SiteNav + index nav swap
_(pending)_

## S4 — Cartón-protagonist home
_(pending)_

## S5 — Shared CardFrame + bespoke pages
_(pending)_

## S6 — Light secondary pages + site-wide nav
_(pending)_

## S7 — Diploma canvas fonts
_(pending)_

## S8 — OG real (subset) fonts
_(pending)_
