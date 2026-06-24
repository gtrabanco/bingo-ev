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

## P2 — portrait 1080×1920 story image (done, gate green)

**What was done:**
- Extended `renderCell` with an optional `dabRadius` parameter (default 26, portrait
  uses 40 — proportionally correct for the ~302px tall portrait cells vs 117px
  landscape cells).
- Added `homeStorySvg()` to `og-image.ts`:
  - Grid: 3 cols × 4 rows, gridX=60, cellW=320, gridY=390, cellH=302 (ends y=1598).
  - Reuses `OG_SITUATIONS` (same 12 situations as landscape) and `renderCell`.
  - Portrait marks at positions [1, 3, 7, 11] — diagonal spread, looks mid-game.
  - Cell params: fontSize=22, maxChars=20, lineHeight=28, dabRadius=40.
  - Title: two lines ("El Bingo" / "del Cargador") SERIF 90px amber.
  - Hook "¿Cuántas llevas tú?" SANS 44px at y=1668; CTA "bingo.gruxon.com"
    SERIF 60px bold amber at y=1778.
  - No QR (unlike diploma story — home invite has nothing to verify).
- Added `src/pages/og/home-story.svg.ts` (mirrors `home.svg.ts` — prerendered, no
  `prerender=false` needed since deterministic).
- Added `src/pages/og/home-story.png.ts` (mirrors `[id]-story.png.ts` —
  `prerender=false`, CF Image Resizing self-fetch, SVG fallback).
- SEO.md portrait note was fully in place from P1 stub — no further edit needed.

**Decisions made during execution:**
- `renderCell` extended with `dabRadius` param so portrait dabs (r=40) are
  proportionally visible in the larger cells. Backward-compatible (default=26).

**Next:** P3 — flip roadmap to `done`, push, open PR (after `/review-change`).
