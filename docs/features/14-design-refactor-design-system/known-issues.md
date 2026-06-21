# 14 — known issues / deferrals

Tracked items the feature consciously does **not** do inline. Each has a trigger or a
home so nothing is silently lost.

## Deferred within the feature

- **OG font cost fallback (S8).** If base64-embedding a Latin subset of Lora in the
  OG/diploma SVG proves disproportionate (image weight, build friction, or it brushes
  the no-deps rule harder than expected), S8 falls back to keeping OG on system
  Georgia and the real-font OG work becomes its **own tracked issue** rather than
  bloating this feature. Trigger: subset asset > ~120KB after embedding, or the
  offline subset step can't be made reproducible without a committed tool.

## Out of scope (recorded, not done here)

- **Promote `amber-300` to a `@theme` accent token.** Today the accent is a stock
  Tailwind class hardcoded across 9 pages **and** inside JS-generated HTML strings
  (`hall-of-fame` `entryHtml`, `g/[id]` `renderPrivateBoard`). The redesign keeps amber
  (D6), so no sweep is needed now — but a future accent change would be a fragile
  repo-wide find/replace that must also touch the JS twins. Promoting it to a token
  makes that a one-line flip. → open a `tech-debt` issue if/when an accent change is
  contemplated. Not triggered by this feature.

- **Font subsetting of the UI faces (S1).** S1 ships full variable woff2 (Latin glyphs
  dominate the es-ES UI but the variable file carries the full range). A Latin subset
  would shave more bytes. Deferred: woff2 already cuts ~40–60% vs the package TTFs and
  preload + metric-tuned fallback address the perceived-perf risk. → revisit only if
  `web-perf` flags font bytes as an LCP regression on mobile.

- **`prefers-color-scheme` / theming.** The site is single-theme (felt/paper). Not in
  scope; no request.

## Watch-list (verify, don't assume)

- **DOM-hook preservation.** Verified empty `comm -23` at planning time, but re-confirm
  after S3 by exercising every nav flow in the browser — there is no test to catch a
  regression (gate is build-only).
- **CLS on font swap.** The metric-tuned fallback must actually match Bricolage's box;
  verify on a throttled reload, not just locally where the font is cached.
- **Two gallery surfaces** (`hall-of-fame` + `jugador`) must stay pixel-identical for
  diploma cards — they carry independent `HONORIFIC_COLORS` copies (S6).

## Ignore (no action, rationale)

- **Dead account-bar DOM on secondary pages.** `Layout.astro` mounts `<SiteNav>` with
  all-false provider props, so `#account-loggedin`, `#device-code-btn`, `#profile-ctl`, etc.
  render hidden (`display:none`, out of a11y tree) on every secondary page. No JS on secondary
  pages wires these elements. Adding a SiteNav prop to skip that subtree would risk breaking the
  DOM hooks that `index.astro`'s script relies on, for a `display:none` element that costs
  ~2 KB HTML and zero user impact. Intentional.
