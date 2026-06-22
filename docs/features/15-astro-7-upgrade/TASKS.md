# 15 — astro-7-upgrade: Tasks

## Phase 0 — Planning

- [x] Copy SPEC template, fill all sections
- [x] Register feature 15 in `docs/features/ROADMAP.md`
- [x] Commit planning artifacts on `feat/15-astro-7-upgrade`

## Phase 1 — Toolchain upgrade ✅ DONE (commit fe687c8)

- [x] Edit `package.json`: `astro` → `7.0.0`, `@astrojs/cloudflare` → `14.0.0`,
  `wrangler` → `4.103.0`
- [x] `npm install` — refresh lockfile; confirm resolved: `astro@7.x`, Vite `8.x`,
  adapter `@14`, `wrangler@4.103`; no peer-dep warnings
- [x] Add `compressHTML: true` to `astro.config.ts`
- [x] `npm run generate-types` — regenerate `worker-configuration.d.ts` (unchanged)
- [x] `npm run build` — gate green; Rust compiler zero HTML errors;
  `dist/server/wrangler.json` emitted
- [x] Dev server browser pass: home, hall-of-fame, privacidad — no console errors;
  all 4xx/5xx in network log are expected
- [x] Update `docs/infrastructure/README.md`: "Astro 6 + v13" → "Astro 7 + v14"
- [x] Update `CLAUDE.md`: adapter-v13 note → "v13...still throws in v14+"
- [x] Write `CHECKLIST.md`
- [x] Flip roadmap to `done`; commit; push; open PR #58

## Phase 2 — Astro 7 performance optimizations

### 2a · `routeRules` cache headers (`astro.config.ts`)

- [ ] Add top-level `routeRules` block with entries:
  - `/hall-of-fame` → `Cache-Control: public, max-age=60, stale-while-revalidate=300`
  - `/og/diploma/**` → `Cache-Control: public, max-age=86400, immutable`
- [ ] Confirm no entry for `/`, `/c/[id]`, `/v/[id]`, `/g/[id]`, `/galeria`
  (those must stay uncached)

### 2b · `prefetch` config (`astro.config.ts`)

- [ ] Add `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }` to
  `defineConfig`

### 2c · Lazy QR import (`src/pages/index.astro`)

- [ ] Locate line 583: `import { renderQrInto } from '../lib/qr';` — remove it
- [ ] Locate `showDeviceCode()` (around line 1936); confirm it is `async`
- [ ] Add `const { renderQrInto } = await import('../lib/qr');` immediately before
  the `renderQrInto(deviceCodeQr, url)` call (line ~1938)
- [ ] Confirm no other `renderQrInto` call sites exist

### 2d · Gate + verification

- [ ] `npm run build` — must remain green; `dist/server/wrangler.json` present
- [ ] Dev server: open `/hall-of-fame` → Network panel → response headers include
  `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- [ ] Dev server: open any `/og/diploma/[id].png` URL → response header includes
  `Cache-Control: public, max-age=86400, immutable`
- [ ] Dev server: home page initial load → `qr.*.js` absent from Network waterfall
- [ ] Dev server: click device-transfer button → `qr.*.js` appears in Network; QR
  renders in the device-code panel
- [ ] No console errors introduced; game logic unchanged

### 2e · Docs + PR

- [ ] Update `CHECKLIST.md` with P2 entries
- [ ] Update PR #58 description to reflect P2 scope
- [ ] Commit P2 changes: `chore(perf): routeRules caching, prefetch, lazy QR import`
- [ ] Push to `feat/15-astro-7-upgrade`

## Phase 3 — Review + merge

- [ ] Hand off to `/review-change` (mandatory)
- [ ] Address any fix-now findings
- [ ] `/audit-pr` merge gate
- [ ] Human merges PR #58
