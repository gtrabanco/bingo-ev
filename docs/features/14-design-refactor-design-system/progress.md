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

**Files changed:**
- `src/components/BingoCard.astro` — full replacement from the integration package.
  Header drops the "Bingo" word, leads with `Cartón nº {serial}` (serial now bold),
  adds a quiet `Vía pública` tag (`text-paper-50/70`). Footer copy
  `Serie: vía pública` → `Sin validez legal`. Header alignment `items-baseline` →
  `items-center`, padding `py-2` → `py-2.5`. **All 5 script hooks preserved**:
  `bingo-card`, `bingo-grid`, `card-serial`, `card-expiry`, `expired-stamp`; grid
  transpose classes byte-identical (win geometry untouched).

**Hook-preservation evidence (grep, build-only gate so no test catches a break):**
- `BingoCard` imported only by `index.astro:6` (`card.ts`/`certificate.ts` hits are
  comments).
- `index.astro` reaches exactly `#bingo-card` (L748), `#bingo-grid` (L749),
  `#card-serial` (L750), `#card-expiry` (L751), `#expired-stamp` (L752), and toggles
  `card-expired` (L1041) — every one preserved.
- No consumer depends on the removed "Bingo" text or `Serie: vía pública` copy.
- The `c/[id].astro:113` "Bingo" literal is a **separate inline reimplementation** →
  belongs to S5a, deliberately untouched here.

**Verified in browser (dev server, also covers S1 font scenarios):**
- `card:no-bingo` ✓ — cartón header `CARTÓN Nº O9CRKWJZ` + `VÍA PÚBLICA`, footer
  `Sin validez legal`; no "Bingo" word on the cartón (the page H1 is separate → S4).
- `fonts:self-hosted` ✓ — network shows `/fonts/SpaceMono-*.woff2` (200); zero
  googleapis/gstatic. `document.fonts`: Bricolage **loaded** + applied to h1/body,
  Space Mono **loaded** + applied to serial, Lora registered (loads on demand, S7).
  Confirms `format('woff2-variations')` parses correctly — no Arial fallback.
- Zero console errors.

**Left open:** copy `Vía pública` / `Sin validez legal` are es-ES, dry, no brand names —
on convention. The page H1 ("EL BINGO DEL CARGADOR") still dominates; its removal is S4
(cartón-protagonist home), as planned.

## S3 — SiteNav + index nav swap

**Files changed:**
- `src/components/SiteNav.astro` — new component (copied from integration package).
  Brand lockup (favicon + "El Bingo / del Cargador") top-left. Icon-over-label action
  bar top-right: Hall of Fame trophy + Vincular phone (device-code-btn). Account bar
  (`#account-bar`) with Google/X login boxes and full logged-in state (profile-ctl,
  logout, delete-account) — all DOM ids and aria attributes preserved verbatim.
  `.nav-action` / `.nav-box` / `.nav-label` classes already in `global.css` (S1).
- `src/pages/index.astro` — inline `<nav>` (L24–151) replaced with
  `<SiteNav hasGoogle={...} hasX={...} hasAnyProvider={...} />`. Import added.
  Brand eyebrow `<header>` removed (D11: SiteNav now carries the brand). Props
  `hasGoogle` / `hasX` / `hasAnyProvider` were already in frontmatter. `device-code-panel`
  confirmed intact at L55.

**Verified in browser (dev server):**
- `nav:sitenav` ✓ — favicon + "EL BINGO DEL CARGADOR" left; Hall + Vincular icons
  right. Bottom-border separator. Eyebrow H1 gone — card is full protagonist.
- Zero console errors.

**Left open (manual verification required in live env):**
- `nav:flows` — OAuth start (Google, X), device-code panel open/close.
- `nav:logged-states` — profile create/edit/disable, logout, delete-account dialog.
  These require live OAuth credentials and cannot be exercised in the dev server
  without real provider keys.

## S4 — Cartón-protagonist home

**Files changed:**
- `src/pages/index.astro` — H1 reduced to compact two-line eyebrow (`text-sm`,
  `text-paper-300/50`); H1 kept for SEO pending S3 (D11). Two-column desktop layout
  removed: `lg:grid lg:grid-cols-[…]` wrapper + left-column `<div class="lg:min-w-0">`
  + `<aside class="lg:min-w-0">` all dropped. Main max-width `lg:max-w-5xl` → `lg:max-w-xl`.
  Papeleo (`<details>`) now flows below the cartón in a single column. Tesla CTA comment
  updated. No DOM/script hook changes.
- `src/components/BingoCard.astro` — two a11y contrast fixes folded from /review-change:
  `text-paper-50/70` → `text-paper-50` (Vía pública: 3.51:1 → 5.25:1 AA pass);
  `text-ink-900/60` → `text-ink-900/70` (footer: 4.02:1 → 5.47:1 AA pass).
- `docs/features/ROADMAP.md` — row 14 delivery description aligned with D10 (was
  "one PR each, never stacked"; now "single branch, single PR after S8").
- `docs/frontend/SEO.md` — corrected "off the critical-path LCP" wording (Bricolage IS
  the LCP face; preload brings the swap earlier, it does not move the face off the path).
- `docs/features/14-design-refactor-design-system/decisions.md` — D11 added (S4 "reduce"
  path rationale).

**Verified in browser:**
- `home:protagonist` ✓ — compact eyebrow above the card, single centered column; status/
  mode/alias/card/buttons/papeleo all flow vertically. No two-column layout on any viewport.
- Zero console errors.

**Left open:** when S3 lands (SiteNav), S3 executor must remove the `<header>` eyebrow
block from `index.astro` — brand will live in SiteNav and the H1 becomes redundant.

## S5 — Shared CardFrame + bespoke pages

**Files changed:**
- `src/components/CardFrame.astro` — new component. Props: `as` (`article`|`section`,
  default `article`), `id`, `class`, `footerCenter` (boolean). Named slots: `header-left`,
  `header-right`, `footer`. Header bar (`bg-dauber-600`) renders only when at least one
  header slot is filled; footer bar (`bg-paper-100`) renders only when `footer` slot is
  filled. `footerCenter` switches footer from `flex justify-between` to `text-center`.
  Outer wrapper always gets the shared chrome:
  `overflow-hidden rounded-2xl border-4 border-ink-900 bg-paper-50 text-ink-900 shadow-[…]`.
- `src/components/BingoCard.astro` — refitted to `<CardFrame id="bingo-card" class="relative w-full">`.
  All 5 script hooks (`bingo-card`, `bingo-grid`, `card-serial`, `card-expiry`,
  `expired-stamp`) preserved verbatim. Grid transpose classes byte-identical.
- `src/pages/c/[id].astro` — found card refitted to `<CardFrame class="mt-4 w-full">`;
  new header: serial mono left / "En directo" right. Footer `/60` → `/70` (AA fix, folded
  from review). Not-found bare wrapper → `<CardFrame class="mt-5">` (no header slots →
  no header bar).
- `src/pages/v/[id].astro` — article refitted to `<CardFrame class="mt-5" footerCenter>`;
  header: serial mono left / "Acta" right. Footer `/60` → `/70` (AA fix, now the CardFrame
  default). Centered footer text via `footerCenter`.
- `src/pages/g/[id].astro` — public standings + private board sections refitted to
  `<CardFrame as="section" ...>`; header: serial mono left / "Sala" right. Not-found
  article → `<CardFrame class="mt-5">` (no header). JS twin `renderPrivateBoard`
  unchanged — `#private-board` id on the CardFrame `<section>` is preserved; the twin
  removes `#private-notice` and appends `<ul>` inside it as before.

**Verified in browser (dev server):**
- `cardframe:parity` (home) ✓ — BingoCard via CardFrame; serial + "Vía pública" header,
  "Sin validez legal / Caduca:" footer. Visual parity with pre-S5 cartón confirmed.
- `cardframe:parity` (c/not-found) ✓ — no header bar, "No consta" stamp renders correctly.
- `cardframe:parity` (v/unknown) ✓ — "CARTÓN Nº / ACTA" header, centered footer.
- `cardframe:parity` (g/not-found) ✓ — no header bar, "No consta" stamp renders correctly.
- Zero console errors across all tested pages.

**Left open (manual verification requires local D1 data or prod):**
- `cardframe:parity` (c/found) — live card view with marked cells.
- `cardframe:parity` (v/verified, v/pending) — verdict stamps on real completed/active cards.
- `cardframe:parity` (g/public standings, g/private board JS twin) — group pages with members.

## S6 — Light secondary pages + site-wide nav

**Files changed:**
- `src/layouts/Layout.astro` — new `nav` prop (default `true`); `SiteNav` import; body
  gains `flex flex-col`; when `nav={true}` renders `<SiteNav hasGoogle={false} hasX={false}
  hasAnyProvider={false} />` in a `max-w-5xl` container before `<slot />`. All-false props:
  secondary pages need brand/Hall nav only; no account JS on them.
- `src/pages/index.astro` — `nav={false}` added to `<Layout>` call; prevents double nav.
- `src/pages/hall-of-fame.astro` — back-link removed; `<style>` block → `.filter-btn-active`
  only; base filter-btn → Tailwind inline classes; client script imports `HONORIFICS` and
  drops local `HONORIFIC_TITLES` dict; `entryHtml` uses `HONORIFICS[entry.honorific]?.title`.
- `src/pages/jugador/[handle].astro` — both `← Hall of Fame` back-links removed (found + 404).
- `src/pages/activar.astro` — `min-h-dvh` → `flex-1`; `Volver al bingo` link removed.
- `src/pages/terminos.astro` — `min-h-dvh` → `flex-1`; `Volver al bingo` link removed.
- `src/pages/privacidad.astro` — `min-h-dvh` → `flex-1`; `Volver al bingo` button removed.
- `src/pages/c/[id].astro`, `v/[id].astro`, `g/[id].astro` — `min-h-dvh` → `flex-1`.

**Verified in browser (dev server):**
- `nav:sitenav` (hall-of-fame) ✓ — brand lockup left, Hall trophy right; back-link gone;
  filter pills correct; gallery cards with honorific colors.
- `nav:sitenav` (index) ✓ — single SiteNav only; `nav={false}` prevents double.
- `nav:sitenav` (terminos) ✓ — SiteNav top; h1 amber uppercase; prose inherits; back-link gone.
- `nav:sitenav` (activar) ✓ — SiteNav top; form centered vertically in flex-1 remaining space.
- Zero console errors.

**Left open (manual verification requires live env):**
- Hall/brand nav links exercisable in dev (no OAuth needed).
- Account bar behavior on index.astro unchanged (secondary pages show no account bar — correct).
- `cardframe:parity` found-card states (same as S5 left-open).

## S7 — Diploma canvas fonts

**Files changed:**
- `src/lib/certificate-design.ts` — SERIF updated from `"Georgia, 'Times New Roman', serif"` to
  `"Lora, Georgia, 'Times New Roman', serif"`; MONO from `"ui-monospace, 'Courier New', monospace"` to
  `"'Space Mono', ui-monospace, 'Courier New', monospace"`. Both now match the `--font-serif`/`--font-mono`
  CSS custom properties defined in `global.css` (S1). OG SVG renderer shares these constants — falls back
  to Georgia until S8 embeds Lora in SVG.
- `src/pages/index.astro` — Added `loadDiplomaFonts()` gate: calls `document.fonts.ready` then
  `document.fonts.load()` for each weight used on the canvas (Lora 400, italic 400, 700 44px; Space Mono
  400, 700 20px). Promise cached as `const fontsReady = loadDiplomaFonts()` at module scope — only loads
  once. `refreshCertificate()` and `openCertificate()` made `async`; both `await fontsReady` before calling
  `drawCertificate()`.

**Verified in browser (dev server):**
- `diploma:png-lora` ✓ — `document.fonts.check()` passes for all Lora weights (400, italic 400, 700) and
  Space Mono (400, 700). Canvas pixel sampling on a test canvas drawn with the same font stack confirmed
  4616 dark ink-colored pixels (RGBA 34, 31, 25 ≈ #221f1a) in the text region — confirms actual rendering
  with the serif font, not a blank fallback. Zero console errors.
- `document.fonts.size = 6` (6 faces registered: BG variable, Lora-variable ×2, SpaceMono ×2).
  All confirmed loaded before first `drawCertificate()` call.

**Left open for S8:**
- OG image SVG renderer still uses SERIF/MONO constants but has no embedded font — falls back to Georgia
  for the OG PNG until S8 base64-embeds a subset of Lora in the SVG `<defs>`.

## S8 — OG real (subset) fonts

**Files changed:**
- `public/fonts/Lora-subset.woff2` (38KB) + `Lora-Italic-subset.woff2` (41KB) — Latin subsets
  (U+0020-007E, U+00A0-017F) of the variable Lora TTFs, generated offline with `pyftsubset
  --layout-features="*" --flavor=woff2`. Space Mono NOT subsetted/embedded: both faces
  together would be 57KB base64, pushing the total to 162KB which exceeds the ~120KB budget
  threshold. Falls back to ui-monospace / Courier New in the SVG renderer (legible at 17px).
- `src/lib/og-fonts.ts` — new file exporting `LORA_WOFF2` and `LORA_ITALIC_WOFF2` as
  `data:font/woff2;base64,...` constants (~108KB source). Documents the regeneration command.
- `src/lib/og-image.ts`:
  - `import { LORA_WOFF2, LORA_ITALIC_WOFF2 } from './og-fonts'` added.
  - `diplomaSvg()` — `<defs><style>` with two `@font-face` rules (Lora 400-700 normal +
    italic, format('woff2-variations')) added immediately after the SVG root element.
  - `diplomaStorySvg()` — same `<defs><style>` block added.
  - `homeSvg()` — `.title` font-family updated from `Georgia, serif` to `${SERIF}` (= Lora,
    Georgia, ...); `.subtitle` from `'Segoe UI', system-ui, sans-serif` to `${SANS}`.
    No font embedding in home.svg (static prerendered SVG served to crawlers; Georgia fallback
    is fine there).

**Verification:**
- Gate green (`npm run build` ✓).
- `dist/client/og/home.svg` confirmed: 2.1KB, `.title { font-family: Lora, Georgia, ... }`,
  no embedded fonts — correct for a static SVG.
- Manual `og:subset` (CF Image Resizing renders Lora in diploma PNG) requires prod with a
  real completed card — left as a deploy-time check.

**Trade-offs recorded:**
- Space Mono omitted from SVG embed (budget constraint ~120KB). Noted in `known-issues.md`.
- Variable font format ('woff2-variations') used in @font-face; falls back to system serif
  if CF Image Resizing renderer doesn't support variable woff2 (same Georgia fallback as before).
