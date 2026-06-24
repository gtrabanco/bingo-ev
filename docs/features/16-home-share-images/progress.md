# 16 — home-share-images · Progress

## P1 — landscape 1200×630 OG image (done, gate green)

**What was done:**
- Added `import situations from '../data/situations.json'` to `og-image.ts`.
- Added module-scope constants and helpers at file scope (shared with future P2):
  - `OG_IDS`: 12 curated situation ids — chosen for punch, brevity, and instant
    recognisability. Final selection: `app-disponible`, `nada-funciona`,
    `potencia-fantasma`, `plaza-ocupada`, `error-desconocido`, `corte-al-80`,
    `unico-rapido-roto`, `reinicia-el-coche`, `mantenimiento-eterno`,
    `precio-sorpresa`, `alta-con-fe`, `cable-corto`.
  - `OG_SITUATIONS`: resolved from `OG_IDS` with top-up guard (always 12 cells).
  - `OG_MARKED`: Set([1, 4, 7, 10]) — spread dabs across rows/columns.
  - `wrapCellText(text, maxChars=24, maxLines=3)`: greedy word-wrap helper.
  - `renderCell(x, y, w, h, text, marked, fontSize?, maxChars?, lineHeight?)`:
    renders paper bg + optional dab + wrapped text; parameterised so P2 can
    reuse it with different `fontSize`/`maxChars` for the larger portrait cells.
- Redesigned `homeSvg()`: 4×3 grid (x=80, cellW=260, y=190, cellH=117), Lora
  title 66px amber, SANS subtitle/hook, dabs at positions 1/4/7/10, hook+CTA
  on one line at y=587 (well within the 60px full-zone margin).
- Added `src/pages/og/home.png.ts`: CF Image Resizing self-fetch of `/og/home.svg`,
  SVG fallback; `export const prerender = false`.
- Updated `src/layouts/Layout.astro` defaults:
  `ogImage = '/og/home.png'`, `ogImageType = 'image/png'`.
- Updated `docs/frontend/SEO.md`: expanded OG images note with PNG-primary info,
  platform-coverage table summary, and portrait asset note (placeholder for P2).

**Decisions made during execution:**
- `renderCell` made flexible (`fontSize`, `maxChars`, `lineHeight` params) so P2
  can reuse it without duplication. Not in the SPEC but follows DRY and doesn't
  add scope — it's the same function called with different arguments.

**Open items / left for P2:**
- Manual dev check for `/og/home.svg` new design (can be done alongside P2 dev check).
- `homeStorySvg()`, `home-story.svg.ts`, `home-story.png.ts`.
- SEO.md portrait asset note finalised in P2 (stub already added).
