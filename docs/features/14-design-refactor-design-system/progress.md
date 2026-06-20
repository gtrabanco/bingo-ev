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

**Files changed:**
- `public/fonts/` — 5 `*.woff2` (BG-variable 201KB, Lora-variable 83KB,
  Lora-Italic-variable 90KB, SpaceMono-Regular 35KB, SpaceMono-Bold 35KB) + 3 OFL
  licenses. Converted offline with `woff2_compress` (no runtime dep).
- `src/styles/global.css` — full replacement from the integration package: 6
  `@font-face` rules (woff2/woff2-variations paths) + metric-tuned fallback
  `Bricolage Grotesque Fallback` (Arial base; `size-adjust:106%`,
  `ascent-override:88%`, `descent-override:20%`); `@theme` gains
  `--font-sans/serif/mono`; `.nav-action`/`.nav-box` component classes added.
- `src/layouts/Layout.astro` — added `<link rel="preload">` for BricolageGrotesque
  woff2 before `<title>`.
- `CLAUDE.md` — L65 parenthetical updated: self-hosted static fonts explicitly
  permitted (no runtime dep), Google Fonts / font npm packages still banned.
- `docs/frontend/DESIGN.md` — replaced "Avoid webfonts" with full Typography section
  (3-face table + fallback + preload notes).
- `docs/frontend/SEO.md` — added "Fonts and LCP" section.
- `docs/frontend/ACCESSIBILITY.md` — added font/nav contrast notes.

**Verification pending (manual, after `npm run dev`):**
- `fonts:self-hosted` — network panel shows `/fonts/*.woff2`; zero googleapis/gstatic.
- `fonts:no-reflow` — throttled reload; no visible text reflow / CLS on swap.

**Left open for next slices:** `.nav-action`/`.nav-box` classes are in `global.css` but
the nav that uses them ships in S3. `font-serif` is wired but only the diploma modal
(S7) and explicit `font-serif` classes will show Lora. The fallback metrics should be
visually validated once a browser can render both the fallback and the real font.

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
