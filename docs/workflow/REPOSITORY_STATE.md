# Normalized Repository State

> Evidence-backed snapshot of the repository. The repository remains the source
> of truth; this ledger is a frozen, reviewable representation of observed truth.

## Snapshot

| Field | Value |
|---|---|
| Snapshot ID | 2026-08-20-001 |
| Source revision | 503b4300e95e3cba263997f53cb8277bebd0b69d |
| Status | frozen |
| Created by | discover-repository-state (refresh of 2026-08-14-001) |

**Observed working-tree delta at freeze time:** the 2026-08-20 scaffold-fix
run is **uncommitted** — modified: `CLAUDE.md`,
`docs/features/ROADMAP.md`, `docs/architecture/ARCHITECTURAL_INVARIANTS.md`,
`.claude/settings.json`, `.agentic-workflow/hooks/guard-command.sh`,
`.agentic-workflow/hooks/README.md`,
`.agentic-workflow/hooks/adapters/{pre-tool-guard.sh,normalize-hook-payload.sh}`;
untracked: `docs/workflow/MIGRATION.md`,
`.agentic-workflow/hooks/adapters/copilot-guard.sh`, `.cursor/`,
`.github/hooks/`, `.opencode/`; plus `package.json` + `bun.lock` (add
`pi-subagents`, see OQ-001). Facts citing those files record working-tree state
and are marked *(wt)*.

## Repository Facts

| ID | Statement | Evidence | Observed at | Status |
|---|---|---|---|---|
| RF-001 | Project stack: Astro 7.0.0 on Cloudflare Workers with D1, Tailwind 4.3.1 | `package.json` dependencies; `astro.config.ts` adapter=cloudflare() | 2026-08-14 | active |
| RF-002 | Node >= 22.12.0 required | `package.json` engines.node | 2026-08-14 | active |
| RF-003 | Verification gate: `npm run build` (astro build) — no test suite, no linter | `package.json` scripts; CLAUDE.md verification gate | 2026-08-14 | active |
| RF-004 | D1 database: `ev-bingo` with 15 additive migrations (0001–0015) | `migrations/` lists 15 `.sql`; tail `0015_drop_newsletter_table.sql` | 2026-08-20 | active |
| RF-005 | Remote forge: GitHub (`github.com:gtrabanco/bingo-ev`), default branch `main` | `git remote -v`; `git branch --show-current` | 2026-08-20 | active |
| RF-006 | Flat architecture: `src/{components,pages,lib,data,layouts,styles}` plus `assets/` — no DDD/domain layers | `find src -maxdepth 1 -type d` | 2026-08-20 | active |
| RF-007 | No accounts/auth dependency for play — card id + owner secret is identity | CLAUDE.md architecture; `src/lib/auth.ts` exists for optional accounts | 2026-08-14 | active |
| RF-008 | Two core D1 tables: `cards` and `groups` (migrations 0001–0008); later additive tables (accounts, sessions, oauth_state, device_codes, profiles, receive_slots) | CLAUDE.md expiry section; `migrations/` listing | 2026-08-14 | active |
| RF-009 | Card geometry: canonical landscape `ROWS=3, COLS=4` (`src/lib/card.ts:41-42`), row-major, 2 situations + 2 blanks per row; win detection uses only those constants (`src/lib/wins.ts`) | `src/lib/card.ts`; `src/lib/wins.ts` imports ROWS/COLS | 2026-08-20 | active |
| RF-010 | Runtime-dependency convention: closed catalog = Astro + Tailwind + `uqr` + `@gtrabanco/newsletter` + `@resvg/resvg-wasm` (CLAUDE.md hard convention); committed `package.json` also lists tooling/pi deps — see OQ-001 | CLAUDE.md hard conventions; `git show HEAD:package.json` | 2026-08-20 | active |
| RF-011 | Secrets: `BREVO_API_KEY` via `npx wrangler secret put`; `.dev.vars` gitignored | CLAUDE.md secrets; `.gitignore` | 2026-08-14 | active |
| RF-012 | UI strings Spanish (es-ES), code comments English, no brand names | CLAUDE.md hard conventions | 2026-08-14 | active |
| RF-013 | Deploy: Cloudflare Workers Builds via `npm run deploy` (db:migrate + wrangler deploy); D1 binding `ev-bingo` | CLAUDE.md deploy; `wrangler.jsonc` d1_databases | 2026-08-20 | active |
| RF-014 | Git history: 242 commits (238 at previous snapshot) | `git log --oneline --all \| wc -l` | 2026-08-20 | active |
| RF-015 | MCP server: Claude Preview (`preview_*`) for headless browser verification | CLAUDE.md MCP servers table | 2026-08-14 | active |
| RF-016 | Forge labels `urgent` (#B60205) and `fix-next` (#D93F0B) exist (seeded additive-only 2026-08-20) | `gh label list` | 2026-08-20 | active |
| RF-017 | Safety-hook guard pack canonical *(wt)*: guard-command blocks bare `export`/`export -p`, env dumps, `.env` reads, direct merges; exec-style pre-tool-guard + copilot-guard adapters; `.claude/settings.json` PreToolUse active | `test-command-guard.sh` PASS (7 allowed, 27 blocked); `test-fullauto-merge.sh` PASS | 2026-08-20 | active |
| RF-018 | `test-init-workspace-contract.sh` is skills-repo CI (expects the template tree under the repo root) — not project-runnable; project hook suite = test-command-guard + test-fullauto-merge | exit 1 when run in-project; MIGRATION.md residual note | 2026-08-20 | active |

## Accepted decisions

| ID | Decision | Rationale | Evidence | Accepted at |
|---|---|---|---|---|
| AD-001 | `compressHTML: true` pin in astro.config.ts — preserves v6 HTML output vs v7 default | astro 7 upgrade feature 15, decision D1 | `astro.config.ts`; `docs/features/15-astro-7-upgrade/SPEC.md` | 2026-08-14 |
| AD-002 | Self-hosted fonts: woff2 in `public/fonts/`, offline-converted, no runtime dep | CLAUDE.md no-new-deps exception; feature 14 `S2` | `public/fonts/`; `docs/features/14-design-refactor-design-system/SPEC.md` | 2026-08-14 |
| AD-003 | Cards immutable once completed — expired/never-completed cards DELETED by GC | CLAUDE.md expiry section; migrations 0001–0008 | `src/lib/api.ts`; CLAUDE.md architecture | 2026-08-14 |
| AD-004 | Account auth AND owner secret both authorize card mutations | Feature 05 accounts | `docs/features/05-accounts/SPEC.md`; `src/lib/auth.ts` | 2026-08-14 |
| AD-005 | Feature 14 has no GitHub issue traceability — no `Closes #14` | Owner decision D9 in feature 14 SPEC | `docs/features/14-design-refactor-design-system/SPEC.md` | 2026-08-14 |
| AD-006 | Feature 15 has no `Closes #N` traceability (not issue-born) | Owner decision D3 | `docs/features/15-astro-7-upgrade/SPEC.md` | 2026-08-14 |
| AD-007 | Feature 04 (analytics) cancelled — Umami added in feature 03 | ROADMAP.md row 04 | `docs/features/ROADMAP.md` | 2026-08-14 |
| AD-008 | Feature 17 (server-side-account) `planned` — not yet executed | ROADMAP.md row 17 | `docs/features/ROADMAP.md` | 2026-08-14 |
| AD-009 | Claude Code PreToolUse safety adapter activated (owner-accepted) | defense-in-depth behind forge rulesets | `.claude/settings.json` *(wt)*; MIGRATION.md | 2026-08-20 |
| AD-010 | `urgent` / `fix-next` labels seeded (owner-accepted, additive-only) | triage-issue vocabulary | `gh label list`; `docs/workflow/MIGRATION.md` | 2026-08-20 |

## Planned work

| ID | Work | Status | Evidence |
|---|---|---|---|
| PW-001 | Feature 01 `final-certificate-design` | done | `docs/features/01-final-certificate-design/SPEC.md` |
| PW-002 | Feature 02 `photo-upload-collage` | deferred | `docs/features/ROADMAP.md` row 02 |
| PW-003 | Feature 03 `public-gallery` | done | `docs/features/03-public-gallery/SPEC.md` |
| PW-004 | Feature 05 `accounts` | done | `docs/features/05-accounts/SPEC.md` |
| PW-005 | Feature 06 `achievements-badges` | planned | `docs/features/ROADMAP.md` row 06; depends on 01 |
| PW-006 | Feature 07 `situations-total-count` | planned | `docs/features/ROADMAP.md` row 07 |
| PW-007 | Feature 08 `vehicle-brand` | done | `docs/features/08-vehicle-brand/SPEC.md` |
| PW-008 | Feature 09 `gallery-profiles` | done | `docs/features/09-gallery-profiles/SPEC.md` |
| PW-009 | Feature 10 `multi-card-conflict` | done | `docs/features/10-multi-card-conflict/SPEC.md` |
| PW-010 | Feature 11 `hall-of-fame` | done | `docs/features/11-hall-of-fame/SPEC.md` |
| PW-011 | Feature 12 `bidirectional-device-transfer` | done | `docs/features/12-bidirectional-device-transfer/SPEC.md` |
| PW-012 | Feature 13 `account-delete-full` | done | `docs/features/13-account-delete-full/SPEC.md` |
| PW-013 | Feature 14 `design-refactor-design-system` | done | `docs/features/14-design-refactor-design-system/SPEC.md` |
| PW-014 | Feature 15 `astro-7-upgrade` | done | `docs/features/15-astro-7-upgrade/SPEC.md` |
| PW-015 | Feature 16 `home-share-images` | done | `docs/features/16-home-share-images/SPEC.md` |
| PW-016 | Feature 17 `server-side-account` | planned | `docs/features/17-server-side-account/SPEC.md` |

## Documentation

| ID | Statement | Document evidence | Implementation evidence |
|---|---|---|---|
| DOC-001 | Architecture detail in `docs/architecture/ARCHITECTURE.md` | doc map; architecture header in CLAUDE.md | file exists |
| DOC-002 | Game rules in `docs/domain/README.md` | doc map | file exists |
| DOC-003 | Design system/palette in `docs/frontend/DESIGN.md` | doc map | file exists |
| DOC-004 | Copy/UX in `docs/frontend/COPYWRITING.md` | doc map | file exists |
| DOC-005 | SEO/metadata in `docs/frontend/SEO.md` | doc map | file exists |
| DOC-006 | Accessibility in `docs/frontend/ACCESSIBILITY.md` | doc map | file exists |
| DOC-007 | GDPR/privacy/consent in `docs/legal/README.md` | doc map | file exists |
| DOC-008 | Infrastructure/deploy in `docs/infrastructure/README.md` | doc map | file exists |
| DOC-009 | Session log at `docs/LOGS.md` | CLAUDE.md session-log section | file exists |
| DOC-010 | Architectural invariants doc now filled with 7 declared invariants (AI-001–AI-007 from CLAUDE.md hard conventions, incl. settleDeparture, canonical grid, additive identity, closed runtime deps) — was template-only at last snapshot | doc-map row; `grep -c '^## AI-'` = 7 | file exists *(wt)* |
| DOC-011 | Migration history doc `docs/workflow/MIGRATION.md` created (dated blocks + residuals) | doc-map row added | file exists *(wt)* |
| DOC-012 | Roadmap legend upgraded to five-state machine (`idea → defined → planned → in-progress → done`) + parked `deferred`/`cancelled` | `docs/features/ROADMAP.md` Status legend *(wt)* | rows still single-state (legacy-compat note in legend) |

## Open Questions

| ID | Question | Evidence | Owner |
|---|---|---|---|
| OQ-001 | Is `pi-subagents` (working-tree `package.json` `dependencies`) a runtime dep or dev/tooling? Is `pi-mcp-adapter` (extraneous at `node_modules`, not declared) relevant? Committed `package.json` only pins Astro/Tailwind/uqr/newsletter/resvg — plus `@joemccann/pi-pdf`, `version`, `view` which nothing in `src/` imports | `git show HEAD:package.json`; `git diff package.json`; `npm ls pi-mcp-adapter` = extraneous; `rg` in `src/` = no matches | TBD |
| OQ-002 | How many distinct «desgracias» exist? Feature 07 / ROADMAP claim 43 | `jq 'length' src/data/situations.json` → **43** (array) | answered 2026-08-20 |
| OQ-003 | Feature 06 (achievements-badges) references memory `achievements-badges-idea` — still the current scope? | ROADMAP row 06 | TBD |

## Inference

| ID | Reasoning | Based on |
|---|---|---|
| INF-001 | Mature production-ready game: 15 D1 migrations, optional accounts, 13 feature SPEC folders, full ROADMAP; deployed via Cloudflare Workers Builds | migration count; feature folders; deploy config |
| INF-002 | A scaffold-upgrade/migration run (`2026-08-20`) is mid-flight **uncommitted** in the working tree (hooks, docs, settings) — commit it before planning so the frozen ledger matches a committed revision | `git status --short`; MIGRATION.md |
| INF-003 | 18 numbered fix-dirs under `docs/fix/` (15,17,20,26,28,31,33,39,41,43,46,48,51,54,67,69,71,72); most fixes predate the `Closes #N` convention — audit traceability before relying on issue links | `ls docs/fix/*/ \| grep -v _TEMPLATE \| wc -l` → 18 |
| INF-004 | No contradiction found between frozen facts and fresh observation — snapshot stays frozen | full re-verification of RF-001…RF-012 evidence above |

## Contradictions

| ID | Frozen fact | New evidence | Reported by | Resolution |
|---|---|---|---|---|
| — | — | — | — | — |

No contradictions found.