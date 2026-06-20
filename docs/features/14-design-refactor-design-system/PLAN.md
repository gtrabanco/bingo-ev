# 14 — PLAN

How the `L` feature is sequenced into independently-shippable slices. **One PR per
slice against `main`; a dependent slice branches only after its predecessor merges
(sequential, never stacked).** The gate (`npm run build`) is green at every slice;
each slice has standalone value.

## Slice dependency graph

```
S1 Foundation (fonts+css+preload+docs) ──┬─▶ S3 SiteNav ──▶ S4 Home protagonist
        │                                │
        │                                └─▶ S6 Light pages + site-wide nav
        ├─▶ S5 CardFrame + bespoke c/v/g
        └─▶ S7 Diploma canvas fonts ──▶ S8 OG subset fonts
S2 Drop BINGO (independent; best visually after S1)
```

| Slice | Size | Depends on | Standalone value |
|---|---|---|---|
| **S1** Fonts + global.css foundation | M | — | Whole site gains the new type via inheritance |
| **S2** Drop "BINGO" from cartón | XS | — (visually after S1) | Home cartón header redesigned |
| **S3** SiteNav + index nav swap | S | S1 | Redesigned header w/ brand lockup on home |
| **S4** Cartón-protagonist home | S | S3 | Completes the home redesign |
| **S5** Shared `<CardFrame>` + c/v/g | L (→ S5a/b/c) | S1 (+S2) | Each card page reaches parity |
| **S6** Light secondary pages + site-wide nav | M | S1, S3 | Consistent shell across all pages |
| **S7** Diploma canvas fonts | M | S1 | Downloadable PNG matches on-page Lora |
| **S8** OG real (subset) fonts | L | S1, S7 | Social/crawler previews match the type |

## Per-slice plan

### S1 — Fonts + global.css foundation (M) · branch ships first
1. **Offline:** convert the 5 package TTFs → woff2 (`fonttools`/`woff2_compress` or
   equivalent, run locally — not a repo dep). Keep variable axes for Bricolage/Lora.
2. Create `public/fonts/`; add the `*.woff2` + the 3 `*-OFL.txt` licenses.
3. Replace `src/styles/global.css` with the package version; repoint every `src()`
   to `/fonts/*.woff2` with `format('woff2')` (variable faces:
   `format('woff2-variations')`).
4. Add a metric-tuned fallback `@font-face` (`size-adjust`, `ascent-override`,
   `descent-override`) named e.g. `'Bricolage Fallback'` mapped into the `--font-sans`
   stack, so the pre-swap box matches Bricolage (kills CLS).
5. `Layout.astro` `<head>` (~after L50): `<link rel="preload" as="font"
   type="font/woff2" href="/fonts/BricolageGrotesque-variable.woff2" crossorigin>`.
6. Docs: `CLAUDE.md` L65 parenthetical; `DESIGN.md` L8 + new Typography section;
   `SEO.md` font-loading note; `ACCESSIBILITY.md` small-text/nav-contrast note.
7. Gate; manual: network shows woff2, no Google Fonts, no reflow.

### S2 — Drop "BINGO" from cartón (XS)
1. Replace `src/components/BingoCard.astro` with the package version.
2. Gate; manual: header = serial + "Vía pública"; expired stamp still shows.

### S3 — SiteNav + index nav swap (S)
1. Add `src/components/SiteNav.astro` (from package).
2. `index.astro`: import it; **surgically** delete the inline `<nav>` L24–151; insert
   `<SiteNav hasGoogle={hasGoogle} hasX={hasX} hasAnyProvider={hasAnyProvider} />`.
   Do not touch surrounding structure (grid/div balance L220/L524; details L817–821).
3. Gate; manual: exercise **every** nav flow (OAuth, device-code, profile sub-states,
   logout, delete-account) — the release-critical check.

### S4 — Cartón-protagonist home (S)
1. Remove the redundant H1 (or reduce to eyebrow + short desc); single centered column
   (`max-w-md`/`lg:max-w-xl mx-auto`); move papeleo below the card; drop the
   `lg:grid lg:grid-cols-[…]` two-column container.
2. Gate; manual: card leads, no reflow of the dialogs/panels.

### S5 — Shared `<CardFrame>` + bespoke pages (L · split S5a/b/c)
- **S5a:** extract `src/components/CardFrame.astro` from the redesigned cartón; refit
  `index.astro`'s `BingoCard` to consume it; re-skin `c/[id].astro` (frame L110–151,
  accent L82/L158). PR.
- **S5b:** re-skin `v/[id].astro` "Acta" (frame L76–151, verdict stamps L92/110/132,
  social footer L160–171) to `<CardFrame>`. PR.
- **S5c:** re-skin `g/[id].astro` (public L117–156, private L159–176) **and** its JS
  twin `renderPrivateBoard` (L555–591/L572–578) in lockstep. PR.

### S6 — Light secondary pages + site-wide nav (M)
1. Mount `<SiteNav>` in `Layout.astro`, prop-gated (`nav={true}` default; pages that
   want a minimal shell pass `nav={false}`) — finalize the opt-out list (D7).
2. Remove now-redundant per-page back-links where SiteNav covers them; keep "Volver"
   affordances only where they add value.
3. `hall-of-fame`: reconcile h1/back-link, `.filter-btn` (L227–247), and the
   `entryHtml` JS twin (L281–289 ↔ L166–201). `jugador`: `HONORIFIC_COLORS` parity
   with hall-of-fame. `activar`: form-control accent. `terminos`/`privacidad`: h1 only.
4. Gate; manual: shell consistent; gallery surfaces identical.

### S7 — Diploma canvas fonts (M)
1. Add a `loadDiplomaFonts()` gate (`document.fonts.ready` + explicit
   `document.fonts.load('700 52px Lora')`) before `drawCertificate()` in the
   `index.astro` script call site.
2. Switch `certificate-design.ts` SERIF/MONO (L24–26) — **canvas-resolved values**;
   keep OG on Georgia for now via per-surface override if needed.
3. Gate; manual: downloaded PNG is Lora/Space Mono.

### S8 — OG real (subset) fonts (L)
1. **Offline:** subset Lora + Space Mono to Latin + used weights; commit the subset as
   a static asset (D8).
2. Base64-embed the subset face in the OG/diploma SVG `<defs>`; update `homeSvg()`
   (`og-image.ts` L239–240) and the diploma SVG renderer; converge the
   `certificate-design.ts` constants now that both surfaces resolve the font.
3. Gate; manual: OG/diploma social SVG renders Lora; image weight acceptable; confirm
   no runtime dep was added. If cost proves disproportionate, fall back to Georgia-OG
   and convert S8 into a tracked follow-up issue (note in `known-issues.md`).

## Review cadence

`execute-phase` hands off to `/review-change` after every 2 slices and once at the
end; each slice's PR is gated by `/audit-pr` before merge. Slices S5 and S8 (the
risky ones) get a review at their own boundary regardless of the 2-slice cadence.
