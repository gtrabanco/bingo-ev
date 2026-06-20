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

- [ ] Add `src/components/SiteNav.astro` (from package).
- [ ] `index.astro`: import SiteNav; delete inline `<nav>` L24–151; render
      `<SiteNav hasGoogle={hasGoogle} hasX={hasX} hasAnyProvider={hasAnyProvider} />`.
- [ ] Confirm props already in frontmatter (`hasGoogle`/`hasX`/`hasAnyProvider`).
- [ ] Do NOT touch `device-code-panel` (L185), `gallery-toggle` (L338), grid balance
      (L220/L524), details auto-open (L817–821).
- [ ] Gate green; **manual `nav:flows` + `nav:logged-states` — release-critical**
      (OAuth start, device-code, profile create/edit/disable, logout, delete-account).
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
- [ ] Extract `src/components/CardFrame.astro` from the redesigned cartón.
- [ ] Refit `index.astro`'s `BingoCard` to consume `<CardFrame>` (hooks preserved).
- [ ] Re-skin `c/[id].astro` (frame L110–151; accent L82/L158) to `<CardFrame>`.
- [ ] Gate; manual `cardframe:parity` (c). PR → review → audit.

### S5b
- [ ] Re-skin `v/[id].astro` "Acta" (frame L76–151; verdict stamps L92/110/132;
      social footer L160–171) to `<CardFrame>`.
- [ ] Gate; manual `cardframe:parity` (v). PR → review → audit.

### S5c
- [ ] Re-skin `g/[id].astro` (public L117–156; private L159–176) to `<CardFrame>`.
- [ ] Update JS twin `renderPrivateBoard` (L555–591/L572–578) in lockstep.
- [ ] Gate; manual `cardframe:parity` (g, incl. private board JS twin). PR → review → audit.

## S6 — Light secondary pages + site-wide nav  `M`  (depends: S1, S3)

- [ ] Mount `<SiteNav>` in `Layout.astro`, prop-gated (`nav` default true; finalize
      opt-out list — D7).
- [ ] Trim redundant per-page back-links where SiteNav covers them.
- [ ] `hall-of-fame`: h1/back-link; `.filter-btn` (L227–247); `entryHtml` twin
      (L281–289 ↔ L166–201).
- [ ] `jugador/[handle]`: `HONORIFIC_COLORS` parity with hall-of-fame (L181–201).
- [ ] `activar`: form-control accent (L61/76/110–115/128–134).
- [ ] `terminos`/`privacidad`: h1 (L16) only; confirm prose inherits.
- [ ] Gate; manual: shell consistent, gallery surfaces identical. PR → review → audit.

## S7 — Diploma canvas fonts  `M`  (depends: S1)

- [ ] Add `loadDiplomaFonts()` gate (`document.fonts.ready` + explicit `load()`)
      before `drawCertificate()` at the `index.astro` call site.
- [ ] Switch `certificate-design.ts` SERIF/MONO (L24–26) for the **canvas** surface
      (per-surface override if OG not yet converged).
- [ ] Gate; manual `diploma:png-lora`. PR → review → audit.

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
