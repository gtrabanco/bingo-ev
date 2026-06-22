# 15 — astro-7-upgrade: Completion checklist

## Gate

- [x] `npm run build` exits 0 — Rust compiler produced zero HTML-validity errors across all 15 `.astro` files
- [x] `dist/server/wrangler.json` emitted by the adapter v14 build
- [x] No type errors (Astro's strict tsconfig, checked during build)

## Package changes

- [x] `astro` 6.4.6 → 7.0.0
- [x] `@astrojs/cloudflare` 13.7.0 → 14.0.0
- [x] `wrangler` 4.100.0 → 4.103.0
- [x] `package-lock.json` refreshed; resolved tree shows `astro@7.x`, Vite `8.x`, adapter `@14`, wrangler `@4.103` — no peer-dependency warnings on `npm install`
- [x] `worker-configuration.d.ts` regenerated via `npm run generate-types`; unchanged (no content delta to commit)

## Config

- [x] `compressHTML: true` added to `astro.config.ts` (D1: preserves Astro 6 whitespace behaviour)

## Compatibility (no code changes needed)

- [x] No `experimental` flags to remove
- [x] No `src/fetch.ts` collision
- [x] No view transitions / `ClientRouter` / `astro:transitions`
- [x] No content collections / `.md` / `.mdx`
- [x] No `@astrojs/db`
- [x] No `cloudflareModules` adapter option / no custom worker entry
- [x] Rust compiler: zero unclosed-tag or invalid-nesting errors

## Manual browser verification (dev server, Astro 7)

- [x] Home (`/`): cartón renders, game UI intact, copy correct, no console errors
- [x] Hall of Fame (`/hall-of-fame`): diplomas listed, filters present, no errors
- [x] Privacidad (`/privacidad`): static page renders correctly, no errors
- [x] Server-side routes: all 4xx/5xx in network log are expected (404 = unknown card, 401 = not logged in, Turnstile 400 = dev mode without real key)
- [x] No unexpected server errors in dev logs

## Architecture invariants

- [x] `import { env } from 'cloudflare:workers'` — no `locals.runtime.env` reintroduced
- [x] All dynamic routes keep `export const prerender = false;`
- [x] Flat `src/{components,pages,lib,data,layouts,styles}` architecture unchanged
- [x] No new runtime dependency added

## Documentation

- [x] `docs/infrastructure/README.md`: "Astro 6 + `@astrojs/cloudflare` v13" → "Astro 7 + `@astrojs/cloudflare` v14"; adapter v13 server-env note updated to "v13...still throws in v14+"
- [x] `CLAUDE.md`: adapter-v13 note updated to "v13...still throws in v14+"

## Audit notes

- `npm audit` reports 6 vulnerabilities (1 low, 5 high) in `@cloudflare/vite-plugin` transitive deps (`miniflare`, `undici`, `ws`, `esbuild`). **All dev-tooling only** — none ship in the deployed Worker bundle. Not addressed here; tracked as a known limitation of Cloudflare's local dev stack.
- Adopting the new `compressHTML: 'jsx'` default is explicitly deferred per D1 — a site-wide whitespace audit is a follow-up, not part of this upgrade.
