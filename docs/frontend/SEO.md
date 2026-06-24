# SEO

Single-language (es-ES), single-origin (`https://bingo.gruxon.com`). No hreflang/i18n.

## Requirements

- **Canonical / metadata**: the HTML shell is `src/layouts/Layout.astro` — title,
  description, OpenGraph/Twitter tags and canonical come from there. The homepage
  (`index.astro`) sets a descriptive, keyword-aware title/description in Spanish.
- **Sitemap**: generated dynamically at `src/pages/sitemap.xml.ts`. Keep it in sync when
  adding public, indexable routes. Per-card pages (`/v/<id>`, `/c/<id>`, `/g/<id>`) are
  user-specific and should not be enumerated in the sitemap.
- **OpenGraph images**: `src/lib/og-image.ts` is the rendering helper for all OG
  images. Two sets of endpoints:
  - **Homepage** — `src/pages/og/home.png.ts` (primary, `og:image` default) and
    `src/pages/og/home.svg.ts` (SVG source / local-dev fallback). The PNG endpoint
    uses CF Image Resizing (self-fetch with `cf.image`); it serves the SVG directly
    in local dev and on plans without Image Resizing — no regression in either case.
    `Layout.astro` defaults: `ogImage = '/og/home.png'`, `ogImageType = 'image/png'`.
    Platform coverage: X/Facebook/WhatsApp/LinkedIn/Telegram/Discord/Slack and
    Instagram Stories link-sticker + DMs all consume the same 1200×630 `og:image`.
    IG feed and TikTok ignore link previews entirely (uploaded vertical content
    required — see portrait asset below).
  - **Portrait story asset** — `src/pages/og/home-story.png.ts` and
    `src/pages/og/home-story.svg.ts` (1080×1920). Reachable at its endpoint URL;
    **not** referenced by any meta tag. Purpose: an uploadable graphic for
    Instagram Stories/Reels and TikTok — platforms that render no link preview.
  - **Per-diploma** — `src/pages/og/diploma/[id].svg.ts` and
    `src/pages/og/diploma/[id].png.ts` (landscape) + the `-story` pair (portrait).
    Reference them from each diploma's OG tags.
- **Structured data**: none required currently; add `WebSite`/`Game` JSON-LD only if a
  concrete need appears (track as a feature, don't add speculatively).
- **`site`** is set in `astro.config.ts` so Astro can build absolute URLs.

## Rules

- The homepage carries the SEO weight (it's the product). Verification/spectator/group
  pages set `cache-control: no-store` and are intentionally not optimized for search.
- Keep copy honest and keyword-natural in Spanish; no keyword stuffing — the dry tone is
  the brand (see `COPYWRITING.md`).

## Fonts and LCP

Bricolage Grotesque (the body/display font) is the LCP face — it renders the page
heading. It is preloaded in `Layout.astro` with `<link rel="preload" as="font" crossorigin>`
so the swap happens as early as possible, minimising the LCP delay vs a late-discovered font.
A metric-tuned fallback `@font-face` minimises CLS on first paint. If a `web-perf` audit
flags font bytes as an LCP regression on mobile, revisit Latin subsetting (recorded in
`docs/features/14-design-refactor-design-system/known-issues.md`).
