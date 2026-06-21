# 14 — TASKS

One section per slice. Each slice is its own PR against `main`. Check items as they
land; record per-slice notes in `progress.md`. Gate = `npm run build` green before
every commit.

> Line refs are to the **current** files at planning time (verified in discovery);
> re-confirm before editing since earlier slices shift line numbers.

## S1 — Fonts + global.css foundation  `M`  (depends: —)

- [x] Offline: convert the 5 `integration/public/fonts/*.ttf` → `*.woff2`
      (variable axes kept for Bricolage/Lora). Dev/offline only — no repo dep.
      Used `woff2_compress` (Google reference encoder). Savings: 401→205KB (BG),
      204→91KB (Lora-Italic), 196→85KB (Lora), 89→35KB (SpaceMono-Bold),
      90→35KB (SpaceMono-Regular).
- [x] Create `public/fonts/`; add the 5 `*.woff2` + 3 `*-OFL.txt` licenses.
- [x] Replace `src/styles/global.css` with `integration/src/styles/global.css`;
      repointed each `src()` → `/fonts/*.woff2`, `format('woff2-variations')` for
      variable faces, `format('woff2')` for static.
- [x] Add metric-tuned fallback `@font-face` (`Bricolage Grotesque Fallback`,
      base Arial; `size-adjust:106%`, `ascent-override:88%`, `descent-override:20%`)
      and fold it into the `--font-sans` stack.
- [x] `Layout.astro` `<head>`: preload Bricolage woff2 (`as=font type=font/woff2
      crossorigin`).
- [x] Docs: `CLAUDE.md` L65 parenthetical; `DESIGN.md` L8 → Typography section;
      `SEO.md` font+LCP note; `ACCESSIBILITY.md` small-text/nav-contrast note.
- [x] Gate green (`npm run build` ✓).
- [ ] Manual `fonts:self-hosted` + `fonts:no-reflow` (after PR merge / dev server).
- [ ] PR → `/review-change` → `/audit-pr`.

## S2 — Drop "BINGO" from cartón  `XS`  (depends: — ; visually after S1)

- [x] Replace `src/components/BingoCard.astro` with the package version.
- [x] Confirm hooks intact: `bingo-card`, `bingo-grid`, `card-serial`, `card-expiry`,
      `expired-stamp`. Verified by grep: `index.astro` L748–752 + L1041 reach exactly
      these 5 ids + `card-expired`; all preserved verbatim. BingoCard imported only by
      `index.astro` (the `c/[id]` "Bingo" literal is a separate inline copy → S5a).
- [x] Gate green; manual `card:no-bingo` verified in browser — header reads
      `CARTÓN Nº {serial}` + `VÍA PÚBLICA`, footer `Sin validez legal`; no "Bingo" word.
- [ ] PR → review → audit (final feature PR, after S8).

## S3 — SiteNav + index nav swap  `S`  (depends: S1)

- [x] Add `src/components/SiteNav.astro` (from package).
- [x] `index.astro`: import SiteNav; delete inline `<nav>` L24–151; render
      `<SiteNav hasGoogle={hasGoogle} hasX={hasX} hasAnyProvider={hasAnyProvider} />`.
- [x] Confirm props already in frontmatter (`hasGoogle`/`hasX`/`hasAnyProvider`). ✓
- [x] Do NOT touch `device-code-panel` — confirmed intact at L55 after swap.
      (S4 grid/aside changes were L220+; the D11 eyebrow header removed here as planned.)
- [x] Gate green; **manual `nav:flows` + `nav:logged-states` — release-critical**
      (OAuth start, device-code, profile create/edit/disable, logout, delete-account).
      ⚠️ Manual verification required in a live environment with OAuth credentials.
- [ ] PR → review → audit.

## S4 — Cartón-protagonist home  `S`  (depends: S3)

- [x] Remove redundant H1 (or reduce to eyebrow + short desc).
      Used "reduce" path (S3 / SiteNav not yet landed): H1 kept for SEO, shrunk
      to compact eyebrow (`text-sm`, `text-paper-300/50`). Full H1 removal deferred
      to S3 (when brand lives in SiteNav). Recorded in decisions.md D11.
- [x] Single centered column (`max-w-md`/`lg:max-w-xl mx-auto`); papeleo below the
      card; drop `lg:grid lg:grid-cols-[…]`.
- [x] Gate green; manual `home:protagonist` (+ dialogs/panels unaffected).
- [ ] PR → review → audit.

## S5 — Shared `<CardFrame>` + bespoke pages  `L`  (depends: S1, +S2)

### S5a
- [x] Extract `src/components/CardFrame.astro` from the redesigned cartón.
- [x] Refit `index.astro`'s `BingoCard` to consume `<CardFrame>` (hooks preserved).
- [x] Re-skin `c/[id].astro` (found card + not-found) to `<CardFrame>`. New header:
      serial left / "En directo" right. Footer `/60` → `/70` AA fix folded in.
- [x] Gate green; manual `cardframe:parity` (c) — not-found renders (no header bar),
      verified in dev server. ✓

### S5b
- [x] Re-skin `v/[id].astro` "Acta" to `<CardFrame footerCenter>`. Header: serial left /
      "Acta" right. Footer `/60` → `/70` AA fix folded in via CardFrame default.
- [x] Gate green; manual `cardframe:parity` (v) — header + centered footer verified. ✓

### S5c
- [x] Re-skin `g/[id].astro` (public + private boards + not-found) to `<CardFrame as="section">`.
      Header: serial left / "Sala" right. Not-found: no header slots (no header bar).
- [x] JS twin `renderPrivateBoard` — no update needed: `#private-board` id preserved on
      the CardFrame `<section>`; JS appends `<ul>` inside it after removing `#private-notice`.
- [x] Gate green; manual `cardframe:parity` (g) — all three states verified in dev server. ✓

## S6 — Light secondary pages + site-wide nav  `M`  (depends: S1, S3)

- [x] Mount `<SiteNav>` in `Layout.astro`, prop-gated (`nav` default true). Opt-out:
      `index.astro` passes `nav={false}` (owns its full-OAuth SiteNav). All secondary
      pages get default `nav={true}`. SiteNav in Layout passes all-false provider props —
      no env access needed (secondary pages don't run account JS).
- [x] Body gains `flex flex-col`; pages with `min-h-dvh` on main → `flex-1`
      (c/v/g/activar/terminos/privacidad), so layout is correct with nav above.
- [x] Trim redundant back-links: hall-of-fame `← Volver al juego`; jugador `← Hall of
      Fame` (found + 404); activar `Volver al bingo`; terminos/privacidad `Volver al bingo`.
- [x] `hall-of-fame`: `<style>` block stripped to `.filter-btn-active` only; base
      filter-btn → Tailwind inline classes; `entryHtml` JS twin imports `HONORIFICS` from
      `certificate-design` (drops local `HONORIFIC_TITLES` dict).
- [x] `jugador/[handle]`: both back-links removed; HONORIFIC_COLORS parity confirmed ✓.
- [x] `activar`: `min-h-dvh` → `flex-1`; back-link removed; form-control accent already
      correct (no change needed).
- [x] `terminos`/`privacidad`: `min-h-dvh` → `flex-1`; h1 on-spec ✓; prose inherits ✓;
      redundant home links removed; cross-links retained.
- [x] Gate green (`npm run build` ✓).
- [ ] Manual: shell consistent, gallery surfaces identical. PR → review → audit.

## S7 — Diploma canvas fonts  `M`  (depends: S1)

- [x] Add `loadDiplomaFonts()` gate (`document.fonts.ready` + explicit `load()`)
      before `drawCertificate()` at the `index.astro` call site. Promise cached as
      `const fontsReady = loadDiplomaFonts()` — resolves once on first call, instant
      on subsequent `refreshCertificate()` invocations (nick input changes).
- [x] Switch `certificate-design.ts` SERIF/MONO (L24–26) to self-hosted fonts:
      `SERIF = "Lora, Georgia, 'Times New Roman', serif"`;
      `MONO = "'Space Mono', ui-monospace, 'Courier New', monospace"`.
      Matches `--font-serif`/`--font-mono` CSS vars. OG SVG renderer also uses
      these constants but falls back to Georgia until S8 embeds Lora in SVG.
- [x] Gate green (`npm run build` ✓).
- [x] Manual `diploma:png-lora` verified: `document.fonts.check()` passes for all
      Lora (400, italic 400, 700) + Space Mono (400, 700) weights. Canvas pixel
      sampling confirmed 4616 dark ink-colored pixels in text area (RGBA 34,31,25
      = #221f1a). Font fallback chain confirmed inactive.

## S8 — OG real (subset) fonts  `L`  (depends: S1, S7)

- [ ] Offline: subset Lora + Space Mono to Latin + used weights; commit subset asset (D8).
- [ ] Base64-embed subset face in OG/diploma SVG `<defs>`; update `homeSvg()`
      (`og-image.ts` L239–240) + diploma SVG renderer; converge
      `certificate-design.ts` constants.
- [ ] Confirm no runtime dependency added; image weight acceptable.
- [ ] Gate; manual `og:subset`. PR → review → audit.
- [ ] If cost disproportionate: fall back to Georgia-OG, convert remainder to a
      tracked issue, note in `known-issues.md`.

## Cross-cutting (every slice)

- [ ] es-ES dry-sarcastic copy, no brand names (auth glyphs excepted).
- [ ] `npm run build` green before commit.
- [ ] DOM/script hooks preserved; no win-logic/geometry change.
- [ ] `a11y:nav-contrast` checked once the nav ships (S1/S3).
