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
| Feature design — capability & integration closure | `docs/CAPABILITIES.md` *(the capability inventory: roles + cross-cutting subsystems; extended whenever a feature introduces one)* |
| A fix | `docs/fix/_TEMPLATE/SPEC.md`, `docs/fix/README.md` |
| Frozen repository knowledge | `docs/workflow/REPOSITORY_STATE.md` *(written by discovery/resolution; consumed by workflow roles)* |
| Template migration history | `docs/workflow/MIGRATION.md` *(why upgraded blocks exist and what they migrate)* |
| Architectural constraints | `docs/architecture/ARCHITECTURAL_INVARIANTS.md` *(optional; explicit rules that architectural changes must preserve)* |
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

**Performance commands:** `none` — the project has no bench, profile, or complexity-lint tooling; `review-perf` will find no numbers to cite here.

## Workflow conventions (the skills read this)

Single source of truth for what every agentic-workflow skill does first and always honors.

**Discovery (always first).** Before acting, read: this guide + the documentation map above, the roadmap (`docs/features/ROADMAP.md`), and the template(s) or recent artifacts for the task at hand. If a doc is missing, say so and fall back to these conventions rather than guessing.

**Normalized Repository State.** When `docs/workflow/REPOSITORY_STATE.md` exists, consume its frozen, evidence-backed facts and accepted decisions before rediscovering them. Keep facts, planned work, documentation, and inference separate. A missing fact may be inspected directly; conflicting evidence becomes a contradiction for `/resolve-repository-state`, never a silent overwrite.

**Architectural invariants.** When the documentation map declares `docs/architecture/ARCHITECTURAL_INVARIANTS.md` (or an equivalent path), classify each applicable rule as preserved, violated, introduced, or changed before designing, planning, implementing, reviewing, or auditing a change. A violation or new/changed rule requires an explicit architectural decision; a feature SPEC, implementation, or passing test cannot silently authorize it. If no invariant document exists, record that no project invariants are declared and continue.

**Forge (issue/PR tracker):** **GitHub (`gh`)** — remote `github.com:gtrabanco/bingo-ev`. The auto-close convention (`Closes #N` in the PR body) must hold.

**Forge bodies are Markdown, not shell — never hand-escape them.** An issue, PR, or comment body renders as Markdown: backticks, `*`, `_`, `#`, `|` are formatting, **not** shell syntax, so **never put a `\` before them**. A stray `\` renders literally (`` `code` `` instead of `` `code` ``) — the most common forge-formatting bug. Always **write the body to a file** (plain Markdown, real backticks, zero backslashes) and pass **`--body-file <path>`** (`gh issue create --body-file`, `gh pr create --body-file`, `gh issue comment --body-file`, or the forge's equivalent) — **never** an inline `--body "…"` or a quoted `<<'EOF'` heredoc, both of which mangle backticks or preserve the stray `\`. A bare non-Markdown one-liner (e.g. `Closes #12`) may stay inline. Verify after: `gh issue view <n> --json body` shows backticks rendering, no literal `` ` ``.

**Git workflow: `branches`** — one active unit at a time, plain `git switch -c` feature/fix branches against `main`, sequential (no worktrees; every skill that creates a branch honors this line).

**Agent safety hooks: Claude Code (active)** — the repository adapter calls `.agentic-workflow/hooks/adapters/pre-tool-guard.sh`, which normalizes the payload and runs `guard-command.sh` before shell/read tools. Direct environment dumps, `.env` reads, and direct merge commands exit non-zero (blocked). Automated merge runs only inside an active `ship-roadmap --fullauto` attempt through the transient wrapper. Cursor / Copilot / OpenCode adapters ship as non-activated examples (`.cursor/hooks.json.example`, `.github/hooks/agentic-workflow.json.example`, `.opencode/plugins/agentic-workflow-guard.ts.example`). Hooks are defense-in-depth — forge branch protection/rulesets remain required.

**Docs language:** every committed artifact (docs, SPECs, PR bodies, commit messages) in **English**, whatever language the work was requested in. (UI strings remain Spanish — see below.)

**Hard rules (always honored).**
- **Branch & PR:** never work on `main`; one PR per unit against `main`; never stack — see [PR & branch workflow](#pr--branch-workflow).
- **Gate before commit:** `npm run build` is green.
- **Evidence over reflex:** verify claims against the code (counts, repro, thresholds) and cite paths; don't assert from assumption.
- **Track, don't inline:** deferred work becomes a tracked issue / known-issue, never silently implemented.
- **Honesty to the user:** never hide real limitations of the product (limits, reductions, restrictions) — disclose them in the UI/output.
- Plus this project's [Hard conventions](#hard-conventions) and the invariants in `docs/architecture/ARCHITECTURE.md` + `ARCHITECTURAL_INVARIANTS.md`.

**Question protocol.** Only ask the user to decide when the answer materially changes the artifact; make routine choices silently and record them. State what is being decided, its scope, criticality, and each option's pros/cons with a recommendation.

## Hard conventions (these override defaults)

- **Server env access**: always `import { env } from 'cloudflare:workers'`. `locals.runtime.env` was removed in `@astrojs/cloudflare` v13 and still throws in v14+. Never create a manual `src/env.d.ts` with a `Runtime` alias — the adapter self-injects `App.Locals`, and a duplicate silently breaks `Locals` under `skipLibCheck`.
- **Every dynamic route** (API endpoint, server-rendered page) must `export const prerender = false;`. Without it Astro tries to prerender and the route breaks.
- **Code comments in English, all UI strings in Spanish (es-ES)** with a dry-sarcastic tone ("humor seco") — never edgy. **No brand names anywhere** (no charger networks, no car makers) in situations or copy.
- **Flat architecture**: only `src/{components,pages,lib,data,layouts,styles}`. No DDD/domain layers.
- **No new runtime dependencies** beyond Astro + Tailwind + `uqr` + `@gtrabanco/newsletter` + `@resvg/resvg-wasm`. Self-hosted **static** fonts in `public/fonts/` (woff2, converted offline) are explicitly permitted — they add no npm/build-time dep and make no third-party requests. Google Fonts / a font npm package / a build-time subsetter-as-runtime-dep are still banned. `uqr` is the approved exception for the diploma QR; `@gtrabanco/newsletter` is the approved exception for newsletter opt-ins (Workers-safe, zero dependencies, pin exact version); `@resvg/resvg-wasm` is the approved exception for SVG→PNG conversion in OG image endpoints (WASM-based, Workers-safe, no transitive runtime deps).
- **Secrets**: `BREVO_API_KEY` via `npx wrangler secret put` only; never in `wrangler.jsonc`. `.dev.vars` holds local secrets and is gitignored — never commit it.
- **Input sanitization on server**: user-supplied strings (alias, group name, nick) are stripped of control chars (`/[ -]/g`), trimmed, and length-capped before any DB write. Match this pattern on new endpoints.

## Testing philosophy

There is **no automated test suite by design**: the verification gate is `npm run
build` (Astro's type-check under `astro/tsconfigs/strict`) plus manual browser
exercise via `npm run dev` (Claude Preview MCP). *Behavior* is verified by running
the app, *not* by mocks or snapshots. A change that genuinely needs a test layer
must introduce it explicitly in its SPEC (a new test harness counts as a new
dependency decision) — never as a silent side effect of a feature commit.

## Naming conventions

| Type | Convention | Example |
|---|---|---|
| Source files / dirs | kebab-case | `src/lib/card.ts`, `src/components/` |
| Components | PascalCase | `BingoCard.astro`, `Layout.astro` |
| Feature folders | `<NN>-<kebab-slug>` | `docs/features/05-accounts/` |
| Branches | `feat/<NN>-<slug>` / `fix/<n>-<topic>` | `feat/05-accounts` |
| DB migrations | zero-padded additive `NNNN` | `migrations/0001_*.sql` |
| API routes | kebab, `export const prerender = false` | `src/pages/api/cards.ts` |
| Commit subjects | `feat|fix|chore(<area>): <summary>` | `feat(accounts): add social login` |

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

A fix is lighter than a feature: only a `SPEC.md` (from `docs/fix/_TEMPLATE/SPEC.md`), registered in `docs/fix/README.md`, no planning artifacts. Every fix has a tracked issue; its PR closes it.

**Fix-now fold ledger.** Step 6 (verification & review) writes fix-now findings from `review-change`/`audit-pr` to `docs/features/<NN>-<slug>/review-findings.md` (fixed schema `| id | file:line | axis | severity | class | route | folded |`, `folded` starting `no`) — the same ledger for both, deduped by `file:line`+axis; `execute-phase`'s fold cycle ticks each folded row `folded: yes`. Fixes use the same convention at `docs/fix/<n>-<topic>/review-findings.md`.

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

## Session log

`docs/LOGS.md` is an append-only journal of working sessions — the *why* and the *what-next* that git history doesn't record. Two ways it's written, both optional:

- **`/log-session`** (manual, rich) — summary, decisions, next step. Run it before `/clear` or before closing for the day.
- **`.claude/` hooks** (automatic, free) — append a mechanical entry on `/clear` and exit; an opt-in hook re-injects the last entry to resume context. Copy `.claude/settings.json.example` to enable; see `.claude/README.md`.

**Context hygiene rule:** end of a unit or phase → `/log-session` then a NEW conversation, never compact — compaction re-reads the whole transcript with the current session model, right when the context is most expensive to re-read; a fresh conversation is ~free because this SPEC/TASKS/progress + the session log already are the persistent memory. Compact only mid-phase, for unpersisted state you can't afford to lose, and prefer committing WIP + a `progress.md` note instead.

## Skills

This project uses the agentic workflow skills ([`gtrabanco/agentic-workflow`](https://github.com/gtrabanco/agentic-workflow)), installed with `npx skills add gtrabanco/agentic-workflow`. They discover this project's docs (the map above) at runtime. When repeated searches recur, capture the knowledge in a project-specific skill rather than re-deriving it.

## MCP servers

| Server | Purpose |
|---|---|
| Claude Preview (`preview_*`) | Run the dev server and verify changes in a headless browser (snapshots, console, network, resize) — the manual-verification harness. |

## Deploy

Repo is connected to Cloudflare Workers Builds: build `npm run build`, deploy `npm run deploy` (applies remote migrations idempotently, then `wrangler deploy`). The build emits the final Worker config to `dist/server/wrangler.json`. Groups created before a migration that adds ownership columns are ownerless — nobody can moderate them and they dissolve via GC once abandoned.
