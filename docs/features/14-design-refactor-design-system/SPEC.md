# 14 — design-refactor-design-system

> Feature specification. Size `L` — a site-wide visual refactor delivered as a
> sequence of **independently-shippable slices** (one PR each, never stacked).
> Full artifact set: this SPEC + `PLAN.md` + `TASKS.md` + `progress.md` +
> `testing.md` + `known-issues.md` + `decisions.md`.

## Goal

Apply the new, pre-authored design system (in `integration/`) across the **entire**
site: self-hosted editorial typography (Bricolage Grotesque / Lora / Space Mono), a
redesigned icon-over-label top navigation extracted into a `SiteNav` component, a
cartón that drops the now-redundant "BINGO" word, a cartón-protagonist home layout,
and — reconciled to the same foundation — every secondary page and the diploma /
OG render path. The game's behaviour, identity model, and DOM/script contract stay
**byte-for-byte intact**; this is CSS, fonts, markup, and copy only.

## Branch

`feat/14-design-refactor-design-system`

## Size

`L` — no data model, no migration, no server logic; the gate stays `npm run build`.
What makes it `L` is breadth: 8 slices, three full-bespoke pages that re-implement
the cartón frame inline, an accent sweep that also reaches JS-generated markup, and
the OG font-embedding path. Delivered as slices so every PR stays XS–M except the
two genuinely large ones (S5, S8), which split into sub-PRs.

## Dependencies

**Hard:** none (no other roadmap feature blocks this). **Soft / consumes:** the
authored package at `docs/features/14-design-refactor-design-system/integration/`
(`INTEGRATION.md`, `global.css`, `BingoCard.astro`, `SiteNav.astro`, the 5 fonts +
3 OFL licenses). Reuses existing `.cell`/`.dab` primitives and the `@theme` palette
(unchanged). Touches feature 05/09 nav sub-states and feature 13's delete button —
all preserved verbatim.

## Context

- **Styling is centralized.** `src/layouts/Layout.astro:3` is the **sole** importer
  of `src/styles/global.css`; every HTML page wraps in `<Layout>` (only
  `galeria.astro` doesn't — it's a 4-line 301). So a font/token change in
  global.css + Layout propagates site-wide for free.
- **Fonts today: zero.** Grep across `src/` and `public/` for
  `@font-face|preload|preconnect|fonts.googleapis|.woff|.ttf` returns nothing. The
  site is system-font-only by the CLAUDE.md "no webfonts" convention. The new system
  is **self-hosted** (no Google Fonts, no npm font dep) — it threads the convention
  but makes its rationale text false (see `decisions.md` D1).
- **The nav is inline in the home page** (`index.astro` L24–151) and the package
  extracts it to `SiteNav.astro`. **Verified release-safe:** `comm -23` of the old
  nav's 21 DOM ids vs the new SiteNav's ids is **empty** — every id, plus
  `data-has-providers` (`index.astro:1671`) and `aria-controls="device-code-panel"`,
  is preserved verbatim. `device-code-panel` (`index.astro:185`) and `gallery-toggle`
  (`index.astro:338`) live in the page body, outside the nav region, untouched.
- **The cartón frame is duplicated, not shared.** `BingoCard.astro` is imported
  **only** by `index.astro`; the same frame markup is hand-copied into
  `c/[id].astro` (L110–151), `v/[id].astro` (the "Acta", L76–151) and `g/[id].astro`
  (public L117–156 + private L159–176, **and** mirrored in a JS template string
  `renderPrivateBoard` L555–591). A card redesign reaches only the home page unless
  these are reconciled — hence the `<CardFrame>` extraction in S5 (D5).
- **The accent (`amber-300`, status `red/green-300`) is a stock Tailwind class, not
  a `@theme` token** — hardcoded across all 9 pages and inside JS-generated HTML
  (`hall-of-fame` `entryHtml` L281–289, `g/[id]` `renderPrivateBoard` L572–578). The
  redesign keeps amber (D6), so no sweep is required; promoting it to a token is a
  recorded nice-to-have, not in scope.
- **Diploma/OG text bypasses webfonts.** The on-page diploma modal is HTML/CSS (gets
  Lora free once fonts ship). The downloadable PNG is `<canvas>` `fillText` (ignores
  `@font-face` unless gated on `document.fonts`), and the OG/social images are
  server-rendered SVG `<text>` (the renderer can't fetch `/fonts/`). Both adopt the
  real fonts in this feature (owner decision — see Scope, S7/S8).

## Business goals

- A coherent, distinctive editorial identity end-to-end — home, secondary pages, and
  the shareable diploma/OG artifacts all speak the same typographic language.
- No regression to the offline-first game, the identity model, or any auth/group/
  delete flow. Visual-only change, shippable in small reviewable increments.

## Technical goals

- Self-hosted fonts with **no new runtime dependency**: ship **woff2** (converted
  offline from the package TTFs), preload the above-the-fold display face, and define
  a metric-tuned fallback `@font-face` so the swap doesn't reflow (CLS).
- Preserve **every** DOM id / aria / hidden-class hook the home script relies on.
- Reconcile the duplicated cartón into a single `<CardFrame>` so future card changes
  are one edit, not four.
- Keep the gate green (`npm run build`) at every slice; each slice independently
  mergeable with standalone value.

## Scope

### In scope (8 slices — see `PLAN.md` for sequencing, `TASKS.md` for tasks)

1. **S1 — Fonts + global.css foundation** `M`. Convert the 5 package TTFs → woff2
   (offline), copy into `public/fonts/` with the 3 OFL licenses; replace
   `global.css` with the package version (point `src()` at woff2); add a metric-tuned
   fallback `@font-face` (`size-adjust`/`ascent-override`); add a `<link rel=preload
   as=font type=font/woff2 crossorigin>` for Bricolage in `Layout.astro` `<head>`;
   update the convention docs (`CLAUDE.md` L65, `DESIGN.md` L8 + new Typography
   section, `SEO.md` font note, `ACCESSIBILITY.md` small-text/nav-contrast note).
   Ships the new type site-wide via inheritance, zero per-page edits.
2. **S2 — Drop "BINGO" from the cartón** `XS`. Replace `BingoCard.astro` with the
   package version (header leads with serial + "Vía pública", footer "Sin validez
   legal"). All 5 hooks preserved.
3. **S3 — SiteNav + index nav swap** `S`. Add `SiteNav.astro`; delete `index.astro`
   nav L24–151; render `<SiteNav hasGoogle hasX hasAnyProvider />`. Verify grid/div
   balance (L220/L524) and details auto-open (L817–821) survive the edit.
4. **S4 — Cartón-protagonist home** `S`. Remove the now-redundant giant H1 (brand
   lives in SiteNav), move to a single centered column (`max-w-md`/`lg:max-w-xl
   mx-auto`), papeleo below the card. Layout-only, one page.
5. **S5 — Shared `<CardFrame>` + bespoke cartón pages** `L` (splittable S5a/b/c).
   Extract a `<CardFrame>` component from the redesigned cartón; re-skin
   `c/[id].astro`, `v/[id].astro`, `g/[id].astro` to it — including the JS-string
   board twin in `g/[id]` `renderPrivateBoard`.
6. **S6 — Light secondary pages + site-wide nav** `M`. Mount `SiteNav` site-wide via
   `Layout.astro` (prop-gated opt-out for pure share/OG-target pages — D7); reconcile
   `hall-of-fame` (back-link/`.filter-btn` L227–247 + `entryHtml` twin), `jugador`
   (`HONORIFIC_COLORS` parity), `activar` form controls; prose pages (`terminos`,
   `privacidad`) inherit free apart from the h1.
7. **S7 — Diploma canvas fonts** `M`. Gate the PNG render on
   `document.fonts.ready`/`load()` and switch `certificate-design.ts` SERIF/MONO
   (L24–26) so the **downloadable** diploma renders Lora/Space Mono.
8. **S8 — OG real fonts** `L`. Generate a **Latin subset** of Lora/Space Mono offline
   (committed static asset, no runtime dep — D8); base64-embed it in the OG/diploma
   SVG `<defs>` and `homeSvg()` (`og-image.ts` L239–240) so social/crawler previews
   match.

### Out of scope / non-goals

- Any change to the data model, migrations, API endpoints, auth/group/delete logic,
  identity model, win detection, card geometry constants, or marks wire format.
- New runtime dependencies. Font conversion/subsetting is an **offline/dev** step
  producing committed assets (D8).
- Promoting `amber-300` to a `@theme` token (recorded nice-to-have, `known-issues.md`).
- Changing the palette hex (byte-identical `@theme` — no contrast regression on
  existing pairings).
- Dark/light theming, new pages, or copy rewrites beyond the nav/card label changes
  the package already makes.

## Architecture impact

Touches only `src/{components,pages,layouts,styles}`, `public/fonts/`, and docs —
flat architecture preserved. Invariants that must hold
(`docs/architecture/ARCHITECTURE.md`):

- **DOM/script contract:** every id/aria/hidden-class the home `<script>` reads or
  writes is preserved verbatim (verified empty `comm -23`). No win logic derives from
  the displayed grid; card geometry constants untouched.
- **Offline-first:** no new network dependency on first paint; fonts are same-origin
  static assets with `font-display:swap` + preload.
- **No new runtime dep**; `env` access patterns and `prerender=false` on dynamic
  routes unchanged (no route logic touched).
- UI strings stay es-ES dry-sarcastic, **no brand names** (Google/X login glyphs are
  the existing functional-auth exception per `docs/legal/README.md`).

## Design

The authored package (`integration/INTEGRATION.md` + the 3 source files) is the
visual source of truth for S1–S3. Key mechanics:

- **Default body font** comes from Tailwind 4 preflight reading `--font-sans` in
  `@theme` — Bricolage applies to `<body>` with no `<body>` edit. Lora is `font-serif`
  (diploma voice), Space Mono is `font-mono` (serials/codes).
- **`SiteNav.astro`** renders brand lockup (favicon + name) top-left and every action
  as an icon-over-label stack (`.nav-action`); provider login becomes 42px boxed
  glyphs (`.nav-box`) under a "Jugar con cuenta" label. Logged-in controls (public
  profile sub-states, logout, "Borrar todo") are preserved verbatim, including the
  feature-13 a11y fix (`text-red-300/80`).
- **`<CardFrame>` (S5, new):** the single canonical cartón frame — ink border, maroon
  `bg-dauber-600` header (serial + "Vía pública"), paper body slot, `bg-paper-100`
  footer, expired stamp. `index.astro`'s `BingoCard`, `c`, `v`, `g` all consume it.
- **Font fidelity (S7/S8):** canvas gated on `document.fonts`; OG SVG carries a
  base64 Latin-subset face in `<defs>`. The shared `certificate-design.ts` constants
  are switched **only after both surfaces are solved** (S7 then S8), or via
  per-surface overrides, so OG never renders a font its renderer can't resolve.

## Decisions

Recorded in full in `decisions.md`. Headlines:

- **D1 — Self-hosted webfonts vs the "no webfonts" convention.** Allowed: static
  assets, no npm dep, no third-party request. Convention text amended, not the rule.
- **D2 — Scope = whole site in feature 14** (owner decision). All 9 secondary pages
  + diploma/OG, not foundation-only.
- **D3 — Diploma + OG adopt real fonts now** (owner decision). Canvas (S7) then OG
  subset-embed (S8).
- **D4 — Include cartón-protagonist home restructure** (owner decision, S4).
- **D5 — Extract a shared `<CardFrame>`** rather than triple-maintain the inline frame.
- **D6 — Keep amber as the accent** (no token migration, no sweep) — scope control.
- **D7 — Mount SiteNav site-wide via Layout**, prop-gated so pure share/OG-target
  pages can opt to a minimal shell (finalized at S6 execution).
- **D8 — Font conversion + subsetting are offline/dev steps** producing committed
  woff2 assets; never a runtime dependency.

## Acceptance criteria

- **Foundation:** the three families load from `/fonts/*.woff2` with **no** request to
  `fonts.googleapis.com`; Bricolage is the default body font site-wide; Bricolage is
  preloaded; a metric-tuned fallback exists; `CLAUDE.md`/`DESIGN.md`/`SEO.md`/
  `ACCESSIBILITY.md` no longer claim "no webfonts".
- **Nav:** the home nav is the `SiteNav` component; **every** prior flow works
  unchanged — Google/X OAuth start, device-code panel open, public-profile create/
  edit/disable, logout, "Borrar todo". No console error; no missing element.
- **Cartón:** no "BINGO" word; serial + "Vía pública" header; "Sin validez legal"
  footer; the "Caducado" stamp still appears on expired incomplete cards.
- **Home:** single centered column, card is the visual lead, no redundant H1.
- **Secondary pages:** `c`, `v`, `g` render the shared `<CardFrame>` (no stale frame);
  `hall-of-fame`/`jugador`/`activar` align to the new shell with the global SiteNav;
  prose pages inherit the new type; the two gallery surfaces stay visually identical.
- **Diploma/OG:** the downloadable PNG renders Lora/Space Mono (not Georgia); OG and
  diploma social images render the subset Lora; no runtime dependency was added.
- **A11y:** new `.nav-action` muted text and small Space Mono serials pass WCAG AA
  contrast on felt-900; focus states intact.
- `npm run build` passes at **every** slice.

## Testing requirements

No test suite — gate is `npm run build` green plus manual verification via
`npm run dev` + the preview MCP. The DOM-hook preservation and the font-loading
behaviour (no Google Fonts request, preload present, no FOUT reflow) are the
highest-risk paths. Full matrix in `testing.md`.

## Dev scenarios

| Scenario | Verifies |
|---|---|
| `fonts:self-hosted` | Network shows `/fonts/*.woff2`, zero `fonts.googleapis.com`; titles in Bricolage, serials in Space Mono |
| `fonts:no-reflow` | Preload present; fallback metric-tuned; no visible text reflow on swap |
| `nav:flows` | OAuth start, device-code panel, profile create/edit/disable, logout, delete-account all work via SiteNav |
| `nav:logged-states` | logged-out shows provider glyphs + "Jugar con cuenta"; logged-in shows label/profile/logout/borrar |
| `card:no-bingo` | header has serial + "Vía pública"; expired stamp still shows |
| `home:protagonist` | single column, no H1, card leads |
| `cardframe:parity` | `c`/`v`/`g` use the shared frame; `g` private board JS twin matches server markup |
| `diploma:png-lora` | downloaded PNG is Lora/Space Mono, not Georgia |
| `og:subset` | OG/diploma social SVG renders Lora; image size sane; no runtime dep |
| `a11y:nav-contrast` | nav muted text + small serials pass AA on felt-900 |

## Phases / slices

Phased by slice (see `PLAN.md`): **S1 → S2 → S3 → S4 → S5(a/b/c) → S6 → S7 → S8.**
One PR per slice against `main`, merged before the next dependent slice branches
(sequential, never stacked). Independent slices (S2) may land any time after S1.

## Deploy & rollback

No migration. Each slice = its own PR; rollback = revert that PR. Fonts are additive
static assets; reverting S1 restores system fonts cleanly. S8's committed subset font
asset is inert if S8 is reverted.

## Open questions / risks

Full register in `known-issues.md` / `decisions.md`. Live ones:

- **Font payload / FOUT / CLS** (high) → woff2 + preload + metric-tuned fallback in S1.
- **A renamed DOM hook breaks a home flow** (high) → verified preserved; manual
  flow-exercise gate in S3.
- **OG subset-embed cost & no-deps tension** (med) → offline subset, committed asset,
  base64 in `<defs>` (D8); if it proves disproportionate, S8 may fall back to keeping
  OG on Georgia and is tracked as its own issue.
- **Inconsistency window** while slices land incrementally (med) → home ships as a
  coherent S1–S4 unit first; secondary pages follow.
- **Small-text contrast** (med) → AA check in S1/S3.

## Deliverables

- `public/fonts/*.woff2` (+ OFL licenses); `src/styles/global.css`;
  `src/layouts/Layout.astro` (preload + site-wide nav); `src/components/SiteNav.astro`,
  `src/components/CardFrame.astro` (new), `src/components/BingoCard.astro`;
  `src/pages/index.astro`, `c/[id].astro`, `v/[id].astro`, `g/[id].astro`,
  `hall-of-fame.astro`, `jugador/[handle].astro`, `activar.astro`, `terminos.astro`,
  `privacidad.astro`; `src/lib/certificate-design.ts`, `certificate.ts`,
  `og-image.ts`, `og-diploma.ts`; docs (`CLAUDE.md`, `docs/frontend/DESIGN.md`,
  `SEO.md`, `ACCESSIBILITY.md`); the full planning artifact set; ROADMAP row 14.

## Post-merge next feature

Per `docs/features/ROADMAP.md` — `06-achievements-badges` or
`07-situations-total-count` (both `planned`). No hard sequencing dependency.
