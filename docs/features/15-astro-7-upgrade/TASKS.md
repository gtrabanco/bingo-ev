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

## Phase 2 — Astro 7 performance optimizations ✅ DONE

### 2a · Cache headers (plan corrected — see PLAN.md)

- [x] `routeRules.headers` found to be silently ignored by Astro 7 + CF adapter
- [x] `hall-of-fame.astro`: `Astro.response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')`
- [x] All 4 OG diploma endpoints: `cache-control: 'public, max-age=86400, immutable'`

### 2b · `prefetch` config (`astro.config.ts`)

- [x] Added `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`

### 2c · Lazy QR import (`src/pages/index.astro`)

- [x] Removed static `import { renderQrInto } from '../lib/qr'`
- [x] `renderDeviceCodeQr` made `async`; `await import('../lib/qr')` inside
- [x] No other `renderQrInto` call sites

### 2d · Gate + verification

- [x] `npm run build` — green; `dist/server/wrangler.json` present
- [x] `curl http://localhost:4321/hall-of-fame` → `cache-control: public, max-age=60, stale-while-revalidate=300`
- [x] Worker bundle (`dist/server/chunks/`) contains `max-age=86400, immutable` strings
- [x] Home page load: `qr.ts` absent from module waterfall (after P2 config applied)
- [x] Prefetch module (`astro/dist/virtual-modules/prefetch.js`) loads on all pages
- [x] No console errors

### 2e · Docs + PR

- [x] Update `CHECKLIST.md` with P2 entries
- [x] Update PR #58 description to reflect P2 scope
- [x] Commit P2 changes: `chore(perf): per-page cache headers, prefetch, lazy QR import`
- [x] Push to `feat/15-astro-7-upgrade`

## Phase 3 — Review + merge

- [x] Hand off to `/review-change` (mandatory)
- [x] Address any fix-now findings (prefetch no-op fix: `data-astro-prefetch` added to nav links)
- [x] Fix CI blocker: `.node-version` (24.16.0) — runner correctly picked up Node from this file
- [x] Fix CI blocker: `packageManager: npm@10.9.2` in package.json — runner was auto-selecting bun over npm
- [x] Fix CI blocker: regenerate `bun.lock` — runner uses bun; existing lockfile was stale after astro@7/cloudflare@14 bump; `bun install --minimum-release-age=0` regenerated it
- [x] Fix SPEC drift: update `SPEC.md` acceptance criteria + D5 + deliverables to per-page headers reality
- [x] `/audit-pr` re-run after blockers fixed
- [ ] Human merges PR #58
