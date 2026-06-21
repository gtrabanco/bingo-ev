# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"El Bingo del Cargador" (bingo.gruxon.com): a single-page parody bingo of Spanish public EV-charger problems. Astro + Tailwind 4 on Cloudflare Workers + D1. See `README.md` for the full feature catalog and game rules; this file covers the architecture, conventions, and agentic workflow that aren't obvious from a single file.

**Always read the relevant documentation (the map below) before changing code.**

## Documentation map

The most important table: it tells an agent *which doc owns what*, so it reads the right context before acting.

| Task | Required docs |
|---|---|
| Any code change | `docs/architecture/ARCHITECTURE.md` |
| New feature / planning / sequencing | `docs/features/ROADMAP.md`, `docs/features/_TEMPLATE/SPEC.md` |
| A fix | `docs/fix/_TEMPLATE/SPEC.md`, `docs/fix/README.md` |
| Game rules (cartón, líneas, marks, groups, expiry) | `docs/domain/README.md` |
| Runtime / deploy / D1 / Brevo / Cloudflare | `docs/infrastructure/README.md` |
| UI visual system / palette / card geometry | `docs/frontend/DESIGN.md` |
| Copy / UX messaging (es-ES, tone, no brands) | `docs/frontend/COPYWRITING.md` |
| SEO / metadata / OG images / sitemap | `docs/frontend/SEO.md` |
| Accessibility | `docs/frontend/ACCESSIBILITY.md` |
| GDPR / privacy / consent | `docs/legal/README.md` |

## Commands

```sh
npm run dev      # game + API + dynamic pages at http://localhost:4321
npm run build    # production build to ./dist  (the verification gate)
npm run deploy   # db:migrate (remote, idempotent) then wrangler deploy
npm run db:migrate   # apply migrations to the REMOTE D1 only

# First-time local setup — the dev server needs the local D1 to exist:
npx wrangler d1 migrations apply ev-bingo --local
```

**Verification gate:** there is **no test suite and no linter**. `npm run build` (`astro build`) type-checks `.astro` files under `astro/tsconfigs/strict` and is the closest thing to CI — it must pass before every commit. Beyond that, verification is manual: run `npm run dev` and exercise the flow in a browser. After adding a migration, run the `--local` apply above before testing, or the new columns won't exist in dev.

## Workflow conventions (the skills read this)

Single source of truth for what every agentic-workflow skill does first and always honors.

**Discovery (always first).** Before acting, read: this guide + the documentation map above, the roadmap (`docs/features/ROADMAP.md`), and the template(s) or recent artifacts for the task at hand. If a doc is missing, say so and fall back to these conventions rather than guessing.

**Forge (issue/PR tracker):** **GitHub (`gh`)** — remote `github.com:gtrabanco/bingo-ev`. The auto-close convention (`Closes #N` in the PR body) must hold.

**Docs language:** every committed artifact (docs, SPECs, PR bodies, commit messages) in **English**, whatever language the work was requested in. (UI strings remain Spanish — see below.)

**Hard rules (always honored).**
- **Branch & PR:** never work on `main`; one PR per unit against `main`; never stack — see [PR & branch workflow](#pr--branch-workflow).
- **Gate before commit:** `npm run build` is green.
- **Evidence over reflex:** verify claims against the code (counts, repro, thresholds) and cite paths; don't assert from assumption.
- **Track, don't inline:** deferred work becomes a tracked issue / known-issue, never silently implemented.
- Plus this project's [Hard conventions](#hard-conventions) and the invariants in `docs/architecture/ARCHITECTURE.md`.

**Question protocol.** Only ask the user to decide when the answer materially changes the artifact; make routine choices silently and record them. State what is being decided, its scope, criticality, and each option's pros/cons with a recommendation.

## Hard conventions (these override defaults)

- **Server env access**: always `import { env } from 'cloudflare:workers'`. `locals.runtime.env` was removed in `@astrojs/cloudflare` v13 and throws at runtime. Never create a manual `src/env.d.ts` with a `Runtime` alias — the adapter self-injects `App.Locals`, and a duplicate silently breaks `Locals` under `skipLibCheck`.
- **Every dynamic route** (API endpoint, server-rendered page) must `export const prerender = false;`. Without it Astro tries to prerender and the route breaks.
- **Code comments in English, all UI strings in Spanish (es-ES)** with a dry-sarcastic tone ("humor seco") — never edgy. **No brand names anywhere** (no charger networks, no car makers) in situations or copy.
- **Flat architecture**: only `src/{components,pages,lib,data,layouts,styles}`. No DDD/domain layers.
- **No new runtime dependencies** beyond Astro + Tailwind + `uqr`. Self-hosted **static** fonts in `public/fonts/` (woff2, converted offline) are explicitly permitted — they add no npm/build-time dep and make no third-party requests. Google Fonts / a font npm package / a build-time subsetter-as-runtime-dep are still banned. `uqr` is the one approved exception for the diploma QR.
- **Secrets**: `BREVO_API_KEY` via `npx wrangler secret put` only; never in `wrangler.jsonc`. `.dev.vars` holds local secrets and is gitignored — never commit it.
- **Input sanitization on server**: user-supplied strings (alias, group name, nick) are stripped of control chars (`/[ -]/g`), trimmed, and length-capped before any DB write. Match this pattern on new endpoints.

## Architecture

Full detail in `docs/architecture/ARCHITECTURE.md`. The essentials an agent must hold:

### Identity model (no accounts, no auth)

Identity is two values: a public **card id** (8 chars, `^[0-9a-z]{8}$`, used in all URLs) and an **owner secret** (16 chars, kept only in the owner's `localStorage`, sent same-origin to authorize mutations). The secret only ever appears in the recovery link (`?card=ID&k=SECRET`), cleaned from the URL right after use. The **alias** is a display *label* (group standings, shared views), **never an identifier**; aliases aren't unique. Group **ownership** is the owner's *card* (`groups.owner_card_id`) — chosen over a browser token so it can be handed over when the owner leaves.

### Two layers: offline-first client, best-effort server

`src/lib/api.ts` is the entire client→server boundary. **Every call degrades to `null`/`false` on failure** (4 s timeout via `AbortSignal.timeout`). The game must keep working with the Worker down. `src/lib/storage.ts` is the localStorage layer: every access is try/catch-guarded so private-browsing falls back to in-memory play (keys prefixed `evbingo.*`). `src/pages/index.astro` holds the **entire game** — markup plus a large client `<script>` that wires card, marks, win detection, certificate dialog, groups and email flows; the pure logic it orchestrates lives in `src/lib/`.

### Card geometry — canonical landscape, CSS-only transpose

The **canonical** card is landscape: `ROWS=3, COLS=4`, row-major, 2 situations + 2 blanks per row (`src/lib/card.ts`). Generation and **win detection always use these constants** (`src/lib/wins.ts`) — a "línea" is always a canonical row. Portrait renders the **transpose with CSS only** (`grid-flow-col grid-cols-3 grid-rows-4`, flipped back under Tailwind's `landscape:` variant). **Never derive win logic from the displayed grid** — only from `ROWS`/`COLS`. Same transpose classes in `BingoCard.astro` and `c/[id].astro`.

### Marks wire format

`MarkKind` is `0|1|2` (clean / suffered / caused — NOT booleans). Serialized as a row-major digit string (`packMarks`/`unpackMarks`), stored in `cards.marks`, validated server-side against `^[012]{12}$`. The diploma honorific derives from how many cells are kind 2 (`honorificFor`).

### Expiry & the D1 registry

A card expires one calendar month after creation *while incomplete* — rule in `expiryFromCreatedAt`, shared by browser and Worker; the **server clock is authoritative**. Two tables (`cards`, `groups`), grown by additive migrations `0001`–`0008`. House rule: **regenerated/expired never-completed cards are DELETED; completed cards are immune**. Card issue and group create each run an **opportunistic GC** in the same batch.

### Group lifecycle invariant — `settleDeparture`

Any time a card leaves a group (`leave`, `kick`, **or any card deletion**), the server must run `settleDeparture` (`src/lib/groups.ts`): against *current* state it vacates the trophy, hands ownership to the most veteran member, and dissolves an emptied room. Card-deletion endpoints use `DELETE ... RETURNING group_id` to trigger it; the GC batches call `orphanedOwnerRepair` as a backstop. Races are guarded **inside the SQL** (membership re-checked in the atomic claim, join `UPDATE` re-asserts the group exists), never by read-then-write. **Any new path that deletes a card or removes it from a group must settle the departure.**

## Feature workflow

Plan before coding: `SPEC.md` → `PLAN.md` → `TASKS.md` → phased execution (one phase per commit, gate-verified) → hardening → review → PR. Start by copying `docs/features/_TEMPLATE/SPEC.md` to `docs/features/<NN>-<slug>/SPEC.md` and registering it in `docs/features/ROADMAP.md` (source of truth for numbering/order/deps). XS/S features: the SPEC is the only artifact.

## Fix workflow

Lighter than a feature: only a `SPEC.md` (from `docs/fix/_TEMPLATE/SPEC.md`), registered in `docs/fix/README.md`, no planning artifacts. Every fix has a tracked issue; its PR closes it.

## PR & branch workflow

- **One PR per unit of work, always against `main`**, independently mergeable (gate passes, standalone value).
- **Never work on `main` directly.** Branch first: `feat/<NN>-<slug>` or `fix/<n>-<topic>`.
- **Never stack PRs.** Split large features into independently shippable slices, never by internal phases.

## Commit format

```txt
feat(<area>): <summary>
fix(<area>): <summary>
chore(<area>): <summary>
```

## Companion review skills

`review-change` and `product-audit` compose these for this web-UI project (a missing one is a noted gap, not a silent skip):

- **Always:** `code-review`, `security-review`, `verify`, `tech-debt`.
- **UI:** `design-review`, `accessibility-review`, `brand-review` (tone + no-brand-names check).
- **Web:** `web-perf` and an SEO skill.

## Skills

This project uses the agentic workflow skills ([`gtrabanco/agentic-workflow`](https://github.com/gtrabanco/agentic-workflow)), installed with `npx skills add gtrabanco/agentic-workflow`. They discover this project's docs (the map above) at runtime. When repeated searches recur, capture the knowledge in a project-specific skill rather than re-deriving it.

## MCP servers

| Server | Purpose |
|---|---|
| Claude Preview (`preview_*`) | Run the dev server and verify changes in a headless browser (snapshots, console, network, resize) — the manual-verification harness. |

## Deploy

Repo is connected to Cloudflare Workers Builds: build `npm run build`, deploy `npm run deploy` (applies remote migrations idempotently, then `wrangler deploy`). The build emits the final Worker config to `dist/server/wrangler.json`. Groups created before a migration that adds ownership columns are ownerless — nobody can moderate them and they dissolve via GC once abandoned.
