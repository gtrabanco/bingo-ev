# 16 — home-share-images · TASKS

Phase checklist. The SPEC is the source of truth for design; this is the operational
breakdown. One gate-green commit per phase, single PR after P2.

## P1 — landscape 1200×630 OG image

- [x] In `src/lib/og-image.ts`, add module-scope shared helpers (used by both images):
  - [x] `OG_SITUATIONS` — curated 12 situations by id (top-up guard), per SPEC →
        situation selection. Pick 12 short, instantly-relatable ids from
        `src/data/situations.json`.
  - [x] `wrapCellText(text, maxChars, maxLines)` greedy word-wrap helper (SPEC →
        text wrapping). Reused by both generators.
- [x] Redesign `homeSvg()` (1200×630): title + subtitle + 4×3 card with wrapped
      situation text + 4 dabs + hook/CTA line. Honour the two-tier safe zone.
- [x] Add `src/pages/og/home.png.ts` — CF Image Resizing self-fetch of `/og/home.svg`
      (`width:1200, height:630`), SVG fallback, `prerender = false`. Mirror
      `src/pages/og/diploma/[id].png.ts`.
- [x] `src/layouts/Layout.astro` — default props `ogImage = '/og/home.png'`,
      `ogImageType = 'image/png'`.
- [x] `docs/frontend/SEO.md` — update OG-images note (PNG now primary, SVG fallback,
      platform-coverage boundary).
- [x] Gate: `npm run build` green.
- [x] Manual dev check: `/og/home.svg` renders the new grid; `/og/home.png` falls
      back to SVG locally; homepage `og:image` points to `/og/home.png`.
- [x] Commit: `feat(16-home-share-images): P1 — landscape OG png + card redesign`.

## P2 — portrait 1080×1920 Story/Reel/TikTok image

- [ ] Add `homeStorySvg()` to `src/lib/og-image.ts` (1080×1920) reusing
      `OG_SITUATIONS` + `wrapCellText`; portrait 3×4 transpose, big title/CTA, no QR
      (SPEC → `homeStorySvg()` layout). Tune `maxChars`/lines to the larger cells.
- [ ] Add `src/pages/og/home-story.svg.ts` (serves `homeStorySvg()`).
- [ ] Add `src/pages/og/home-story.png.ts` — CF Image Resizing self-fetch
      (`width:1080, height:1920`), SVG fallback, `prerender = false`. Mirror
      `src/pages/og/diploma/[id]-story.png.ts`.
- [ ] `docs/frontend/SEO.md` — note the portrait asset endpoint (uploadable, no meta
      tag).
- [ ] Gate: `npm run build` green.
- [ ] Manual dev check: `/og/home-story.svg` renders the portrait; `/og/home-story.png`
      falls back to SVG locally.
- [ ] Commit: `feat(16-home-share-images): P2 — portrait story/reel image`.

## P3 — PR

- [ ] Flip roadmap row 16 to `done`.
- [ ] `git push`, open PR against `main` (single PR for P1+P2).
- [ ] Hand off to `/review-change`.

## Decision (settled — no action needed)

- **D-surfacing** CONFIRMED (owner, 2026-06-24): portrait is exposed by endpoint URL
  only; **no** home share-UI button in this feature. A homepage "invítales a jugar"
  Web-Share button is a separate future feature. P2 stays endpoint-only.
