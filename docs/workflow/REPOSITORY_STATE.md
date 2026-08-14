# Normalized Repository State

> Evidence-backed snapshot of the repository. The repository remains the source
> of truth; this ledger is a frozen, reviewable representation of observed truth.

## Snapshot

| Field | Value |
|---|---|
| Snapshot ID | 2026-08-14-001 |
| Source revision | 81e94fea8a6dd72a043ecbf2c747556b3ba88c17 |
| Status | frozen |
| Created by | discover-repository-state |

## Repository Facts

| ID | Statement | Evidence | Observed at | Status |
|---|---|---|---|---|
| RF-001 | Project stack: Astro 7.0.0 on Cloudflare Workers with D1, Tailwind 4.3.1 | `package.json` dependencies; `astro.config.ts` adapter=cloudflare() | 2026-08-14 | active |
| RF-002 | Node >= 22.12.0 required | `package.json` engines.node | 2026-08-14 | active |
| RF-003 | Verification gate: `npm run build` (astro build) — no test suite, no linter | `package.json` scripts; CLAUDE.md verification gate section | 2026-08-14 | active |
| RF-004 | D1 database: `ev-bingo` with 15 additive migrations (0001–0015) | `migrations/` contains 15 `.sql` files | 2026-08-14 | active |
| RF-005 | Remote forge: GitHub (`github.com:gtrabanco/bingo-ev`), default branch `main` | `git remote -v`; `git branch --show-current` | 2026-08-14 | active |
| RF-006 | Flat architecture: `src/{components,pages,lib,data,layouts,styles}` only | Directory listing of `src/`; CLAUDE.md hard conventions | 2026-08-14 | active |
| RF-007 | No accounts/auth dependency for play — card id + owner secret is identity | CLAUDE.md architecture section; `src/lib/auth.ts` exists for optional accounts | 2026-08-14 | active |
| RF-008 | Two D1 tables core: `cards` and `groups` (grew by migrations 0001–0008) | CLAUDE.md expiry section; migrations present | 2026-08-14 | active |
| RF-009 | Card geometry: 3 rows × 4 columns landscape, 2 situations + 2 blanks per row | CLAUDE.md card geometry section; `src/lib/card.ts` | 2026-08-14 | active |
| RF-010 | No new runtime dependencies beyond: Astro, Tailwind, uqr, @gtrabanco/newsletter, @resvg/resvg-wasm | CLAUDE.md hard conventions; `package.json` dependencies (pi-mcp-adapter and pi-subagents are dev/tooling deps, not runtime) | 2026-08-14 | active |
| RF-011 | Secret management: `BREVO_API_KEY` via `npx wrangler secret put`; `.dev.vars` gitignored | CLAUDE.md secrets; `.gitignore` | 2026-08-14 | active |
| RF-012 | UI strings: Spanish (es-ES), code comments English, no brand names | CLAUDE.md hard conventions | 2026-08-14 | active |
| RF-013 | Deploy: Cloudflare Workers Builds via `npm run deploy` (db:migrate + wrangler deploy) | CLAUDE.md deploy section; `package.json` scripts | 2026-08-14 | active |
| RF-014 | Git history: 238 commits | `git log --oneline --all | wc -l` | 2026-08-14 | active |
| RF-015 | MCP server: Claude Preview (`preview_*`) for headless browser verification | CLAUDE.md MCP servers table | 2026-08-14 | active |

## Accepted decisions

| ID | Decision | Rationale | Evidence | Accepted at |
|---|---|---|---|---|
| AD-001 | `compressHTML: true` pin in astro.config.ts — preserves v6 HTML output vs v7 default `jsx` | astro 7 upgrade feature 15, decision D1 | `astro.config.ts`; `docs/features/15-astro-7-upgrade/SPEC.md` | 2026-08-14 |
| AD-002 | Self-hosted fonts: woff2 files in `public/fonts/`, offline-converted, no runtime dep | CLAUDE.md no-new-deps exception; feature 14 | `public/fonts/`; `docs/features/14-design-refactor-design-system/SPEC.md` | 2026-08-14 |
| AD-003 | Cards are immutable once completed — expired/never-completed cards DELETED by GC | CLAUDE.md expiry section; migrations 0001–0008 | `src/lib/api.ts`; CLAUDE.md architecture | 2026-08-14 |
| AD-004 | Account auth AND owner secret both authorize card mutations | Feature 05 accounts | `docs/features/05-accounts/SPEC.md`; `src/lib/auth.ts` | 2026-08-14 |
| AD-005 | Feature 14 has no GitHub issue traceability — no `Closes #14` | Owner decision D9 in feature 14 SPEC | `docs/features/14-design-refactor-design-system/SPEC.md` | 2026-08-14 |
| AD-006 | Feature 15 (astro 7 upgrade) has no GitHub issue traceability — no `Closes #N` | Owner decision D3 | `docs/features/15-astro-7-upgrade/SPEC.md` | 2026-08-14 |
| AD-007 | Feature 04 (analytics) cancelled — Umami added directly in feature 03 | ROADMAP.md | `docs/features/ROADMAP.md` row 04 | 2026-08-14 |
| AD-008 | Feature 17 (server-side-account) planned — no execution yet | ROADMAP.md status=planned | `docs/features/ROADMAP.md` row 17 | 2026-08-14 |

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
| PW-016 | Feature 17 `server-side-account` | planned | `docs/features/17-server-side-account/SPEC.md`; depends on none |

## Documentation

| ID | Statement | Document evidence | Implementation evidence |
|---|---|---|---|
| DOC-001 | Architecture detail lives in `docs/architecture/ARCHITECTURE.md` | CLAUDE.md doc map; architecture header | `docs/architecture/ARCHITECTURE.md` exists |
| DOC-002 | Game rules (cartón, lines, marks, groups, expiry) in domain docs | CLAUDE.md doc map | `docs/domain/README.md` exists |
| DOC-003 | Design system / palette / card geometry in frontend docs | CLAUDE.md doc map | `docs/frontend/DESIGN.md` exists |
| DOC-004 | Copy / UX messaging in es-ES in copywriting doc | CLAUDE.md doc map | `docs/frontend/COPYWRITING.md` exists |
| DOC-005 | SEO / metadata / OG images / sitemap in SEO doc | CLAUDE.md doc map | `docs/frontend/SEO.md` exists |
| DOC-006 | Accessibility guidelines in a11y doc | CLAUDE.md doc map | `docs/frontend/ACCESSIBILITY.md` exists |
| DOC-007 | GDPR / privacy / consent in legal docs | CLAUDE.md doc map | `docs/legal/README.md` exists |
| DOC-008 | Infrastructure / deploy / D1 / Brevo / Cloudflare in infra doc | CLAUDE.md doc map | `docs/infrastructure/README.md` exists |
| DOC-009 | Session log maintained at `docs/LOGS.md` | CLAUDE.md session log section | `docs/LOGS.md` exists |
| DOC-010 | Architectural invariants document exists but is empty template | CLAUDE.md doc map references it | `docs/architecture/ARCHITECTURAL_INVARIANTS.md` exists (template-only) |

## Open Questions

| ID | Question | Evidence | Owner |
|---|---|---|---|
| OQ-001 | Is `pi-mcp-adapter` and `pi-subagents` in `package.json` a runtime dependency or a dev-only tool? | They appear in `package.json` dependencies but may be dev-only | TBD |
| OQ-002 | How many distinct desgracias exist? Feature 07 claims 43. | Feature 07 summary in ROADMAP; `src/data/situations.json` | TBD |
| OQ-003 | Feature 06 (achievements-badges) references a memory `achievements-badges-idea` — is that memory still the current scope? | FEATURE 06 ROADMAP row; no SPEC folder | TBD |

## Inference

| ID | Reasoning | Based on |
|---|---|---|
| INF-001 | The project has a mature, production-ready game with 15 D1 migrations, optional accounts, and full feature tracking — likely deployed to production (Cloudflare Workers Builds configured) | MIGRATIONS count (0001-0015); deploy config; 14+ features with SPECs; ROADMAP shows multiple done features |
| INF-002 | The agentic workflow scaffold was recently upgraded (init-workspace just completed) — the REPOSITORY_STATE.md was a fresh template before this | `docs/workflow/REPOSITORY_STATE.md` was template-only; CLAUDE.md includes new sections (forge-body-formatting, fold ledger, etc.) added in this session |
| INF-003 | 19 fix SPECs exist in `docs/fix/` — many fixes may have been merged without corresponding CLOSED issues (no `Closes #N` pattern confirmed) | 19 files in `docs/fix/`; feature 14 and 15 both have no `Closes #N` |

## Contradictions

| ID | Frozen fact | New evidence | Reported by | Resolution |
|---|---|---|---|---|
| — | — | — | — | — |

No contradictions found.