# 15 — astro-7-upgrade

> Feature specification. SPEC-only (Size `S`) — implement in a single pass with
> `execute-phase 15`.

## Goal

Move the runtime foundation from **Astro 6 + `@astrojs/cloudflare` v13** to
**Astro 7 + `@astrojs/cloudflare` v14**, bring **wrangler** to its current 4.x,
and confirm every other dependency is already current. Astro 7 ships the
Rust-based compiler and Vite 8 as defaults; staying on v6 means the project drifts
off the supported line and away from the adapter releases that track Cloudflare's
Vite-plugin runtime. This is a maintenance upgrade: no game behaviour, identity
model, schema, or copy changes — only the toolchain underneath them, plus the doc
strings that name the old versions.

## Branch

`feat/15-astro-7-upgrade`

## Size

`M` — originally sized `S` (toolchain bump only, single-pass). Expanded after P1
shipped to add **Phase 2: Astro 7 performance optimizations** (`routeRules` cache
headers, `prefetch` config, lazy QR import). Full artifact set (`PLAN.md`,
`TASKS.md`) generated at expansion time. No schema change, no new dependency.

## Dependencies

**Hard:** none — the upgrade is self-contained. **Soft:** should land on a clean
`main` with no other in-flight feature branch, because it touches the build/runtime
foundation every other branch builds on (rebase cost). Best sequenced before any
new feature work resumes.

## Context

Current pinned versions (`package.json`):

| Package | Current | Target | Kind |
|---|---|---|---|
| `astro` | `6.4.6` | `7.0.0` | **major** |
| `@astrojs/cloudflare` | `13.7.0` | `14.0.0` | **major** |
| `wrangler` | `4.100.0` | `4.103.0` | minor |
| `@tailwindcss/vite` | `4.3.1` | `4.3.1` | already latest |
| `tailwindcss` | `4.3.1` | `4.3.1` | already latest |
| `uqr` | `0.1.3` | `0.1.3` | already latest |
| `@gtrabanco/newsletter` | `0.1.1` | `0.1.1` | already latest (pin exact — approved exception) |

Compatibility was verified against the registry, not assumed:

- `astro@7.0.0` engines: `node >=22.12.0` — `package.json` already requires
  `>=22.12.0`; local dev runs Node 24.16. **No engine bump needed.**
- `astro@7.0.0` pulls **Vite `^8.0.13`**.
- `@astrojs/cloudflare@14.0.0` peers: `astro ^7.0.0`, `wrangler ^4.83.0` — both
  satisfied by the targets above.
- `@tailwindcss/vite@4.3.1` peer `vite` range is `^5.2.0 || ^6 || ^7 || ^8` —
  **already Vite-8 ready**, no Tailwind bump required.

Why the migration is low-risk for *this* project specifically (audited, not
assumed):

- `astro.config.mjs` has **no `experimental` block** → none of the removed/
  stabilised experimental flags (`logger`, `queuedRendering`, `rustCompiler`,
  `advancedRouting`, `cache`/`routeRules`) apply.
- **No view transitions / `ClientRouter` / `astro:transitions`** usage → the
  removed transition internals don't apply.
- **No content collections, no `.md`/`.mdx`** → the new Sätteri markdown pipeline
  and `@astrojs/markdown-remark` peer don't apply.
- **No `src/fetch.ts`** → the new reserved-filename collision doesn't apply.
- **No `@astrojs/db`** (the project uses D1 directly) → its removal doesn't apply.
- Adapter is plain `cloudflare()` with **no `cloudflareModules` option and no
  custom worker entry file** → the v14 worker-entry/manifest/`cloudflareModules`
  removal changes don't apply.

What remains as real, in-scope risk: the **Rust compiler's stricter HTML** (15
`.astro` files) and the **new `compressHTML: 'jsx'` whitespace default** on a
copy-sensitive Spanish parody UI.

## Business goals

n/a — internal/technical maintenance. Indirect benefit: faster builds (Rust
compiler) and staying on the supported Astro/adapter line so future security and
Cloudflare-runtime fixes remain a `patch`/`minor` away rather than a deferred
major.

## Technical goals

- The verification gate (`npm run build`) passes on Astro 7 with zero new warnings
  that indicate misconfiguration.
- The deployed Worker behaves identically: `import { env } from 'cloudflare:workers'`
  still resolves, every `prerender = false` route still server-renders, and the
  build still emits `dist/server/wrangler.json`.
- No regression in rendered output across the site (the parody copy, cartón
  geometry, diploma canvas/OG images, and all secondary pages render as before).

## Scope

### In scope

- Bump `astro` → `7.0.0`, `@astrojs/cloudflare` → `14.0.0`, `wrangler` → `4.103.0`
  in `package.json`; refresh the lockfile via `npm install`.
- Regenerate `worker-configuration.d.ts` (`npm run generate-types`) if the wrangler
  bump changes it.
- Set `compressHTML: true` in `astro.config.mjs` to **preserve Astro 6 whitespace
  behaviour** (decision D1) — the smallest change that removes the whitespace risk.
- Fix any HTML the Rust compiler rejects (unclosed non-void tags, invalid nesting
  such as block elements inside `<p>`) surfaced by `npm run build`.
- Update doc strings that name the old versions: `docs/infrastructure/README.md`
  ("Astro 6 + `@astrojs/cloudflare` v13" → v7 / v14), `CLAUDE.md` (the
  "Astro + Tailwind 4" framing and the adapter-v13 `locals.runtime.env` note, which
  stays valid but should reference v13+ → v14), and any other doc that pins "v13".
- Full manual verification (no test suite exists) across the whole site, plus a
  build + a deploy dry-run check.

### Out of scope / non-goals

- **Adopting the new `compressHTML: 'jsx'` default** — deliberately deferred; pin
  `true` now (D1). Revisiting the JSX whitespace default is a separate follow-up,
  not this upgrade.
- **Any game/behaviour/schema/copy change** — this is a toolchain bump + perf config only.
- **Tailwind / uqr / newsletter version changes** — already latest; bumping them is
  not part of this work.
- **New D1 migration** — none is introduced.
- **KV application-level cache layer** — `routeRules` edge/browser caching at the
  HTTP layer is sufficient; a KV-backed server cache is a separate architectural
  addition.
- **Cloudflare dashboard Cache Rules** — configuring edge-cache rules in the
  dashboard is operational work, not code; the `routeRules` headers are correct
  without it (browser cache + potential edge cache from Cloudflare's automatic
  caching policy for `Cache-Control: public` responses).
- **Prefetching `/` (home)** — the home page has per-user card state loaded from
  `localStorage`; caching or prefetching it would serve stale/wrong content to
  returning users.

## Architecture impact

Touches only the toolchain and the two documentation files that name versions. The
invariants in `docs/architecture/ARCHITECTURE.md` are **unchanged and must remain
true after the bump**:

- Server env access stays `import { env } from 'cloudflare:workers'` (adapter v13's
  removal of `locals.runtime.env` carries into v14 — do **not** reintroduce it, and
  do **not** add a manual `src/env.d.ts` with a `Runtime` alias).
- Every dynamic route keeps `export const prerender = false;`.
- Flat `src/{components,pages,lib,data,layouts,styles}` architecture is untouched.
- No new runtime dependency is added (the bump replaces majors in place).

The migration may **not** touch `src/lib/*` logic, endpoints, or markup except to
fix Rust-compiler HTML-validity errors, and those fixes must be behaviour-preserving
(correct nesting / closing tags only — no restructuring of game logic or DOM/script
hook ids).

## Design

**Order of operations (single commit for code, optionally a second for docs):**

1. Edit `package.json` versions (astro, @astrojs/cloudflare, wrangler).
2. `npm install` → refresh `package-lock.json`. Confirm the resolved tree:
   `astro@7`, Vite `^8`, adapter `@14`, wrangler `@4.103`.
3. Add `compressHTML: true` to the `defineConfig({...})` object in
   `astro.config.mjs`.
4. `npm run generate-types` — commit `worker-configuration.d.ts` only if it changed.
5. `npm run build` (the gate). If the Rust compiler errors on a `.astro` file, open
   the named file, add the missing closing tag or fix the invalid nesting, rebuild.
   Repeat until green. Expect **few or zero** edits — the templates already build
   under v6's Go compiler, and most v6-valid HTML is also v7-valid.
6. `npm run dev` + local D1 (`npx wrangler d1 migrations apply ev-bingo --local`)
   and walk the dev scenarios below.
7. Update the version strings in `docs/infrastructure/README.md` and `CLAUDE.md`.

**`compressHTML` rationale.** Astro 7 changes the default from HTML-aware
compression (`true`) to JSX rules (`'jsx'`), which strips the single space between
adjacent inline elements (`<span>hello</span><em>world</em>` → `helloworld`). On a
Spanish-copy parody UI with no snapshot tests, silently losing inter-element spaces
is a real regression risk. Pinning `compressHTML: true` reproduces v6 output
exactly, making this upgrade a pure toolchain change with no rendered-output delta
to chase. Re-evaluating the JSX default is explicitly deferred (see non-goals).

## Decisions to confirm

- **D1 — `compressHTML` (DECIDED: pin `true`).** Preserve Astro 6 whitespace
  behaviour rather than adopt the new `'jsx'` default. Rationale: zero rendered-
  output risk on an untested, copy-sensitive UI; keeps the upgrade a pure toolchain
  bump. Adopting `'jsx'` (and auditing/fixing spacing site-wide) is a separate
  follow-up. *Owner may override to "adopt `'jsx'` now" if they want the framework
  default — that would enlarge scope to a site-wide whitespace audit.*
- **D2 — doc-string updates bundled (DECIDED: yes).** Update the version mentions in
  `docs/infrastructure/README.md` and `CLAUDE.md` in the same PR so the docs never
  lie about the running version. Low cost, keeps the documentation map honest.
- **D3 — single PR (DECIDED: yes).** Code + doc-string updates ship as one PR
  against `main`; the upgrade is independently mergeable and gate-verified. Not
  issue-born → no `Closes #N`.
- **D4 — `routeRules` scope (DECIDED: gallery pages + OG diploma images).** Cache
  `/hall-of-fame` and `/og/diploma/**` only. `/galeria` is already a 301 redirect
  (pure function, no body to cache). Dynamic game pages (`/c/[id]`, `/v/[id]`,
  `/g/[id]`) serve live D1 data and must remain uncached. The main `/` page serves
  per-user state — never cache. `Cache-Control: public, max-age=60,
  stale-while-revalidate=300` on the gallery (stale is acceptable; new diplomas
  appear within 60–360 s). `Cache-Control: public, max-age=86400, immutable` on
  OG images (diplomas are immutable once created — the card data never changes).
- **D5 — `prefetch` strategy (DECIDED: `hover`, not `prefetchAll`).** `prefetchAll`
  would prefetch every internal `<a>` on page load, wasting bandwidth for users who
  navigate to only one page. `hover` (200 ms delay) targets likely navigation with
  zero wasted prefetch for users who don't hover. Configured globally in
  `astro.config.ts`. When `prefetchAll: false`, Astro only prefetches links that
  carry `data-astro-prefetch` — added to the `/` brand link and `/hall-of-fame` nav
  link in `SiteNav.astro`.
- **D6 — QR lazy import (DECIDED: dynamic import at call site).** `renderQrInto`
  has a single call site (`index.astro:1938`, inside `showDeviceCode()`). The
  `qr.js` module (10 KB) is split by Vite but loaded eagerly by the module graph.
  Convert to `const { renderQrInto } = await import('../lib/qr')` inside
  `showDeviceCode()` to defer the download until the device-transfer button is
  clicked. No other call sites exist.

## Acceptance criteria

**P1 (done):**
- `package.json` pins `astro@7.0.0`, `@astrojs/cloudflare@14.0.0`,
  `wrangler@4.103.0`; lockfile resolves Vite `8.x` with no peer-dep warnings.
- `npm run build` exits 0 and emits `dist/server/wrangler.json`.
- `astro.config.ts` contains `compressHTML: true`.
- Home, hall-of-fame, and privacidad render in dev without console errors.
- `docs/infrastructure/README.md` and `CLAUDE.md` updated to v7/v14.

**P2 (done):**
- `hall-of-fame.astro` frontmatter sets `Cache-Control: public, max-age=60,
  stale-while-revalidate=300` via `Astro.response.headers.set()`. (Note: `routeRules.headers`
  is silently stripped by Astro 7's `RouteRulesSchema` — per-page response headers are the
  correct approach; see PLAN.md and CHECKLIST.md for the discovery and rationale.)
- All four OG diploma endpoints (`[id].{png,svg}.ts`, `[id]-story.{png,svg}.ts`) return
  `cache-control: public, max-age=86400, immutable` on both success and 404 branches.
- `astro.config.ts` contains `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`.
- `data-astro-prefetch` added to both nav links in `SiteNav.astro` (see D5).
- `GET /hall-of-fame` response carries `Cache-Control: public, max-age=60,
  stale-while-revalidate=300` in dev (verify via Network panel).
- `GET /og/diploma/[id].png` response carries `Cache-Control: public,
  max-age=86400, immutable` in dev.
- `qr.js` does NOT appear in the Chromium Network waterfall on home page load
  (before the device-transfer button is clicked).
- After clicking the device-transfer button, the device-code QR still renders
  correctly (lazy import resolves and `renderQrInto` executes).
- `npm run build` remains green after P2 changes.
- No game logic changed; no DOM/script hook ids changed.

## Testing requirements

No automated test suite or linter exists — verification is the build gate plus
manual exercise per project convention. Required:

- **Build gate:** `npm run build` green (type-checks `.astro` + Rust-compiler HTML
  validity).
- **Manual browser pass** (Claude Preview MCP / `npm run dev`): walk every dev
  scenario below, watching the console and network panels for errors.
- **Adapter/runtime smoke:** confirm at least one API endpoint (e.g.
  `POST /api/cards`) returns correctly in dev, proving the v14 adapter + Vite-8
  build still wires `cloudflare:workers` env and D1.
- Prefer exercising real flows over any mocking (there is nothing to mock here).

## Dev scenarios

All reachable through existing mechanisms — the upgrade adds no new states, it must
prove the *existing* ones still work post-bump.

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `build:gate` | toolchain compiles | `npm run build` exits 0, emits `dist/server/wrangler.json` |
| `render:home` | static + Tailwind 4 under Vite 8 | load `/`, cartón renders, no missing whitespace in copy |
| `render:secondary` | all server/static pages compile | visit `/hall-of-fame`, `/privacidad`, a `/c/[id]`, a `/v/[id]`, a `/g/[id]` |
| `runtime:env` | `cloudflare:workers` env still resolves under adapter v14 | `POST /api/cards` in dev creates a card (local D1 applied) |
| `runtime:prerender-false` | dynamic routes still SSR | server-rendered card/verification pages return live data, not a prerender error |
| `render:diploma` | canvas fonts + `uqr` QR + OG image | complete a card, open the diploma and its OG image |
| `whitespace:inline` | `compressHTML: true` preserves inter-element spaces | inspect copy with adjacent inline elements — spacing matches pre-upgrade |
| `cache:gallery` | Cache-Control header on hall-of-fame HTML response | Network panel in dev: response header present on `/hall-of-fame` |
| `cache:og-diploma` | Cache-Control header on OG diploma PNG | Network panel in dev: response header present on `/og/diploma/[any-id].png` |
| `prefetch:hover` | qr.js absent from initial load, present after button click | Network panel: qr.js absent at DOMContentLoaded; appears after device-transfer button click |

## Phases

Size `M` — `execute-phase 15 P2` (P1 done):

- **P0 (done):** planning artifacts + roadmap registration (committed on branch).
- **P1 (done):** toolchain bump, `compressHTML`, regenerate types, verify, doc
  strings — committed on branch, PR #58 open.
- **P2 (done):** per-page `Cache-Control` headers (hall-of-fame + OG diploma endpoints);
  `prefetch` config in `astro.config.ts`; `data-astro-prefetch` on nav links; dynamic
  QR import at call site; build gate; browser verification; updated PR #58 description.
  See `TASKS.md` and `PLAN.md` (correction: `routeRules.headers` replaced by per-page
  response headers after discovering Astro 7's `RouteRulesSchema` strips the `headers` key).
- **P3 (PR):** PR #58 already open — update title/description if needed; no new PR.

## Deploy & rollback

- **Deploy:** standard `npm run deploy` (`db:migrate` is a no-op — no new migration
  — then `wrangler deploy`). The git-connected Cloudflare Workers Build runs
  `npm run build` with the new toolchain. **Before merging, confirm a local
  `npm run build` produces a valid `dist/server/wrangler.json`** so the connected
  build won't fail on the runner.
- **Rollback:** revert the PR. The bump is in `package.json`/`package-lock.json` +
  one config line + doc strings; reverting restores Astro 6 exactly. No data
  migration, so rollback is clean and immediate.

## Open questions / risks

- **R1 — Rust compiler rejects existing HTML.** Mitigation: build-gated; fix the
  named file's nesting/closing tags, behaviour-preserving only. Likelihood low (v6
  templates are generally v7-valid), impact contained to the build step.
- **R2 — Vite 8 breaks a Vite plugin.** Only `@tailwindcss/vite` is used and it
  already declares Vite-8 support; the Cloudflare Vite plugin ships with the v14
  adapter. Mitigation: the build gate surfaces any incompatibility immediately.
- **R3 — Connected Cloudflare build differs from local.** Partially materialized: all
  branch commits showed `Workers Builds: bingo-ev` failure; root cause was no Node
  version pin — Cloudflare's runner defaulted to an older Node incompatible with
  Astro 7's `>=22.12.0` requirement (`package.json` `engines` is not used by CF Workers
  Builds for Node selection). **Fixed:** `.node-version` file added to repo root pinning
  `24.16.0`. Local `npm run build` and `dist/server/wrangler.json` verified before merge.
- **R4 — `worker-configuration.d.ts` drift from the wrangler bump.** Mitigation:
  regenerate with `npm run generate-types` and commit only if it changed.
- RESOLVED — Node engine: no bump needed (project already `>=22.12.0`).
- RESOLVED — Tailwind/uqr/newsletter: already latest, out of scope.
- DEFERRED — adopting `compressHTML: 'jsx'`: tracked in issue #59, not this feature (D1).
- NOTE — Cloudflare dashboard Cache Rules: `routeRules` sets `Cache-Control` headers
  on Worker responses. Browser caching is guaranteed. Cloudflare edge caching of
  Worker-generated HTML depends on the plan's automatic caching policy; enabling it
  via dashboard Cache Rules is operational work outside this feature's code scope.
  OG images (`/og/diploma/**`) benefit most from caching even at browser level alone.

## Deliverables

**P1 (delivered):**
- `package.json` + `package-lock.json` with the three bumped versions.
- `astro.config.ts` with `compressHTML: true`.
- Updated version strings in `docs/infrastructure/README.md` and `CLAUDE.md`.

**P2 (delivered):**
- `astro.config.ts` with `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`.
- `src/pages/hall-of-fame.astro`: `Astro.response.headers.set('Cache-Control', ...)` in frontmatter.
- All four OG diploma endpoints: `cache-control: public, max-age=86400, immutable`.
- `SiteNav.astro`: `data-astro-prefetch` on `/` brand link and `/hall-of-fame` nav link.
- `src/pages/index.astro`: top-level `import { renderQrInto }` removed; dynamic
  `import('../lib/qr')` at call site.
- Updated PR #58 description reflecting the full scope.
- `.node-version` pinning Node `24.16.0` for Cloudflare Workers Builds runner.

**P3 (CI fix — Node pin):**
- `.node-version` file added to repo root, pinning `24.16.0` (local Node version; satisfies
  Astro 7's `>=22.12.0` engine requirement). Fixes Cloudflare Workers Builds CI failure.

**PR:** #58 (already open, against `main`, no `Closes #N`).

## Post-merge next feature

Returns the sequence to the planned roadmap work — `06 achievements-badges` or
`07 situations-total-count` (next `planned` entries). See
`docs/features/ROADMAP.md`.
