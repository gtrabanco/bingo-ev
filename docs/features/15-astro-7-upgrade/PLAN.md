# 15 — astro-7-upgrade: Plan

Feature was originally S (single-pass). Expanded to M after P1 shipped to add
Astro 7 performance optimizations. P0 and P1 are done and committed.

## Phase 0 — Planning (DONE)

Produced: `SPEC.md`, roadmap registration. Committed on `feat/15-astro-7-upgrade`.

## Phase 1 — Toolchain upgrade (DONE)

Committed on `feat/15-astro-7-upgrade` (commit `fe687c8`). PR #58 open.

What was done:
- `package.json`: `astro` 6.4.6→7.0.0, `@astrojs/cloudflare` 13.7.0→14.0.0,
  `wrangler` 4.100.0→4.103.0.
- `npm install` → lockfile refreshed; resolved Vite 8.0.16.
- `astro.config.ts`: added `compressHTML: true` (D1).
- `npm run generate-types` → `worker-configuration.d.ts` unchanged.
- `npm run build` green; Rust compiler zero errors; `dist/server/wrangler.json`
  emitted.
- Browser verification: home, hall-of-fame, privacidad all clean.
- Doc strings updated: `docs/infrastructure/README.md`, `CLAUDE.md`.

## Phase 2 — Astro 7 performance optimizations (DONE)

Three independent changes across `astro.config.ts`, `index.astro`, and SSR pages.
One gate-verified commit.

### 2a — Cache headers (D4 — plan correction)

**Original plan** used `routeRules.headers` in `astro.config.ts`. This was wrong:
Astro 7's `RouteRulesSchema` only accepts `maxAge`/`swr`/`tags` (the new cache
abstraction); the `headers` key is silently stripped. `@astrojs/cloudflare` v14
does not process `routeRules` at all. Verified by inspecting adapter source.

**Actual implementation** — per-page response headers:
- `hall-of-fame.astro`: `Astro.response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')`
- `og/diploma/[id].{png,svg}.ts` + `[id]-story.{png,svg}.ts`: `'cache-control': 'public, max-age=86400, immutable'` in each `Response` headers object (all four endpoints already had `max-age=3600`; bumped to `86400, immutable` per D4).

Rationale (D4):
- `/hall-of-fame` shows public gallery data, no user-specific HTML. 60 s TTL +
  stale-while-revalidate=300 s means Cloudflare and browsers serve cached pages
  instantly while revalidating. New diplomas appear within ≤360 s — acceptable.
- `/og/diploma/**` (PNG + story PNG + SVG variants): diplomas are immutable once
  created. 24 h immutable cache means the image is generated once per ID and then
  served from cache by browsers and CDN (Twitter/Discord embed scrapers, Cloudflare).
- `/`, `/c/[id]`, `/v/[id]`, `/g/[id]` serve per-user or live D1 data — never cache.

### 2b — `prefetch` config

Add to `astro.config.ts` (D5):

```ts
prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
```

Astro injects a lightweight prefetch script that starts loading a linked page
200 ms after the user hovers over an `<a>` to it. With `prefetchAll: false`,
only links that explicitly opt in with `data-astro-prefetch` are prefetched
automatically — except that `defaultStrategy: 'hover'` makes all internal links
eligible on hover without per-link annotation. This means navigating to
`/hall-of-fame`, `/activar`, `/privacidad` from the home page feels instant.

No per-link changes needed; Astro handles the injection.

### 2c — Lazy QR import

In `src/pages/index.astro`:

- **Remove** line 583: `import { renderQrInto } from '../lib/qr';`
- **Add** inside `showDeviceCode()` (around line 1936), just before `renderQrInto`
  is called at line 1938:

```ts
const { renderQrInto } = await import('../lib/qr');
```

Rationale (D6): `qr.js` (10 KB) is currently in the module graph and downloaded
on every home page load, even for the vast majority of users who never use the
device-transfer feature. A dynamic import defers the download to the moment the
user opens the device-code panel. Vite already splits it as a separate chunk;
this simply changes the load trigger from "page load" to "button click".

The function `showDeviceCode()` is `async` already (it `await`s the API call that
creates the device code). Adding one more `await` for the import is safe.

### 2d — Gate + verification

- `npm run build` green.
- Dev server: verify Cache-Control headers on `/hall-of-fame` and
  `/og/diploma/[id].png` via Network panel.
- Verify `qr.js` absent from the initial network waterfall; present after the
  device-transfer button is clicked and the QR renders.
- Update PR #58 description to reflect P2.

## Phase 3 — PR (in progress)

PR #58 already open. No new PR needed. After P2 is committed:
- Update PR title/body if scope differs from what's there.
- Hand off to `/review-change` (mandatory).
