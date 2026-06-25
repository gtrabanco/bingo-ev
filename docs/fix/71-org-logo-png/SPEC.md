# fix/71-org-logo-png

## Goal

`Organization.logo` in the JSON-LD structured data points to `/favicon.svg`. SVG is
listed in Google's supported structured-data image formats, but Google Rich Results
Test cannot be run programmatically, and SVG logo acceptance for rich results is
historically unreliable. Swap to a PNG served by the existing `@resvg/resvg-wasm`
pipeline — eliminates the uncertainty with no extra dependencies.

## Issue

`#71` — tracked issue. The PR closes it.

## Branch

`fix/71-org-logo-png`

## Root cause

PR #70 (`Layout.astro:77`) set `"logo": "https://bingo.gruxon.com/favicon.svg"`. No
PNG logo endpoint existed at the time; SVG was the only option. After fix #72 added
`@resvg/resvg-wasm`, a `/og/logo.png` endpoint is trivial and eliminates the SVG
acceptance risk entirely.

## Scope

### In scope

1. New endpoint `src/pages/og/logo.png.ts` — renders the favicon SVG at 512×512 via
   `svgToPng`, returns `image/png` with a long-lived `Cache-Control`.
2. Update `Layout.astro:77` — `Organization.logo` URL changed from
   `/favicon.svg` → `https://bingo.gruxon.com/og/logo.png`.

### Out of scope

- Changes to the favicon SVG source.
- OG image endpoints (already rewritten in fix #72).
- Retaining the SVG logo URL as a fallback — PNG is unconditionally correct.

## Impact

- `src/pages/og/logo.png.ts` (new)
- `src/layouts/Layout.astro` (one line change)
- `svgToPng` lazy-init fires for this endpoint on first isolate request even though
  the favicon SVG has no text — fonts load but go unused. Acceptable: they end up
  cached for OG image endpoints in the same isolate.

## Rules that must never be violated

- `export const prerender = false` on the new endpoint.
- No `locals.runtime.env` — not needed.
- No new runtime dependencies — `@resvg/resvg-wasm` is already approved (fix #72).
- Code comments in English.

## Risks

- **Font fetch on logo-only isolate** — first request fetches BricolageGrotesque even
  though the logo SVG has no text. Risk: low (font is self-hosted, fetch always
  resolves; 205 KB cold-start cost is negligible for a background crawler fetch).

## Acceptance criteria

- [ ] `GET /og/logo.png` → `content-type: image/png`, 200 OK. — manual/curl
- [ ] Response is a valid 512×512 PNG with the bingo-ball icon. — visual
- [ ] Google Rich Results Test on `https://bingo.gruxon.com` detects `Organization`
      entity with logo field accepted (no warning). — manual post-deploy
- [ ] `npm run build` green. — gate

## Rollback

Revert the `Layout.astro` line to `/favicon.svg` and delete `src/pages/og/logo.png.ts`.
No data-side changes.

## Effort

XS — one new 10-line endpoint, one string change in `Layout.astro`.
