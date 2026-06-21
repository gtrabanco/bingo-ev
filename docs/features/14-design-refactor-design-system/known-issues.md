# 14 — known issues / deferrals

Tracked items the feature consciously does **not** do inline. Each has a trigger or a
home so nothing is silently lost.

## Deferred within the feature

- **Space Mono not embedded in OG SVG (S8 partial).** Embedding all 4 font subsets
  (Lora ×2 + SpaceMono ×2) would be ~162KB base64, exceeding the ~120KB budget.
  S8 embeds Lora only (104.5KB base64). Space Mono falls back to ui-monospace /
  Courier New in CF Image Resizing. The verify URL (17px monospace) is legible in
  Courier New. To embed SpaceMono too: either accept the larger SVG weight or find
  a smaller subset (ASCII-only, ~15KB each). → open a follow-up issue if Courier New
  fallback is unacceptable in the rendered PNG.

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
- **CF Image Resizing honoring `@font-face` data-URIs (S8).** The OG diploma PNG depends on
  Cloudflare's SVG→PNG renderer loading the base64 variable-woff2 embedded in `<defs><style>`.
  If CF's renderer ignores `@font-face` (some rasterizers only use system fonts) or rejects
  the `woff2-variations` format, the PNG silently renders **Georgia** — no regression vs
  pre-S8, but the Lora goal is unmet. **Untestable locally** (dev's PNG endpoint falls back to
  SVG). **Verify in prod** by fetching `/og/diploma/{completed-id}.png` and eyeballing the
  serif. If Georgia: fallback options are (a) embed a **static-instance** Lora subset instead of
  variable (broader renderer support), or (b) accept Georgia-OG and close the goal. → open a
  tracked issue only if prod shows the fallback.

## Ignore (no action, rationale)

- **Dead account-bar DOM on secondary pages.** `Layout.astro` mounts `<SiteNav>` with
  all-false provider props, so `#account-loggedin`, `#device-code-btn`, `#profile-ctl`, etc.
  render hidden (`display:none`, out of a11y tree) on every secondary page. No JS on secondary
  pages wires these elements. Adding a SiteNav prop to skip that subtree would risk breaking the
  DOM hooks that `index.astro`'s script relies on, for a `display:none` element that costs
  ~2 KB HTML and zero user impact. Intentional.
