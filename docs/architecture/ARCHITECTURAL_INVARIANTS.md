# Architectural invariants

> Optional. Keep this document only when your project has long-lived
> architectural constraints that autonomous changes must preserve.

Architectural invariants are repository constraints, not coding standards,
feature requirements, or implementation details. They change only through the
explicit architectural-decision path named by the project.

## How to use this document

One invariant per section. Make each rule independently checkable and cite
evidence from the repository. A missing document means no project invariants
are declared; workflow skills must remain compatible with that state.

```markdown
## AI-001 — <short rule>

- Rule: <property that must remain true>
- Rationale: <why it protects the repository>
- Applies to: <modules, public contracts, or change types>
- Evidence: <paths, tests, commands, or diagrams that establish the rule>
- Change authority: <decision record or named approval path>
```

## Invariants

Each rule below is **declared by the project** (CLAUDE.md names it as an
invariant, canonical rule, or hard convention). They are not inferred from
implementation; a change that violates one requires an explicit architectural
decision through the authority named per rule.

**Change authority (default):** the project owner, via an explicit decision
recorded in the accepted-decisions ledger (`docs/workflow/REPOSITORY_STATE.md`
→ Accepted decisions) and/or a feature-SPEC decision record. `product-audit`
and `review-change` classify these rules; `resolve-repository-state` updates
frozen ledger facts. A feature SPEC, implementation, or passing test can never
silently authorize a violation.

---

## AI-001 — Card geometry is canonical landscape (3×4)

- Rule: Generation and **win detection always use** `ROWS=3, COLS=4` from
  `src/lib/card.ts` / `src/lib/wins.ts`; a "línea" is always a canonical row.
  Portrait rendering is a **CSS-only transpose** — never derive win logic from
  the displayed grid.
- Rationale: win-detection integrity — a win shown on screen that the canonical
  grid cannot produce must be impossible, and a línea must mean the same thing
  in both orientations.
- Applies to: `src/lib/card.ts`, `src/lib/wins.ts`, `BingoCard.astro`,
  `src/pages/c/[id].astro`, and any future card renderer.
- Evidence: CLAUDE.md "Card geometry" section; `ROWS`/`COLS` constants; the
  shared transpose classes in both card renderers.
- Change authority: owner decision (project-wide authority above).

## AI-002 — Every card-leaves-group path settles the departure

- Rule: any path that deletes a card or removes it from a group (`leave`,
  `kick`, card deletion, account erasure, GC) must run `settleDeparture`
  (`src/lib/groups.ts`): vacate the trophy, hand ownership to the most veteran
  member, dissolve an emptied room. Races are guarded **inside the SQL**
  (membership re-checked in atomic claims, join re-asserts the group exists),
  never by read-then-write.
- Rationale: group ownership/trophy consistency depends on one ordered
  departure rule; ad-hoc removal paths silently desynchronize the group.
- Applies to: card-deletion endpoints (`DELETE ... RETURNING group_id`),
  `leave`/`kick`, GC `orphanedOwnerRepair`, account erasure.
- Evidence: CLAUDE.md "Group lifecycle invariant — `settleDeparture`";
  `src/lib/groups.ts`; `src/lib/api.ts`.
- Change authority: owner decision (project-wide authority above).

## AI-003 — Identity stays additive: no account required to play

- Rule: card id + owner secret is the identity baseline; optional accounts
  (`src/lib/auth.ts`) are an **additive** layer that never makes authentication
  required for play and never weakens secret-proven card ownership.
- Rationale: offline-first play and private-browsing fallback are product
  invariants; a login wall would break the core game.
- Applies to: `cards`/`groups` identity columns, auth endpoints, any
  account-gated surface.
- Evidence: CLAUDE.md "Identity model"; REPOSITORY_STATE AD-004;
  `docs/features/05-accounts/SPEC.md` (additive substrate, never required).
- Change authority: owner + product decision (project-wide authority above).

## AI-004 — No new runtime dependencies

- Rule: the runtime-dependency catalog is closed: Astro + Tailwind + `uqr` +
  `@gtrabanco/newsletter` + `@resvg/resvg-wasm`. Self-hosted static fonts
  (woff2, offline-converted) are permitted; Google Fonts, a font npm package,
  and a build-time subsetter as runtime dep count as violations.
- Rationale: Workers bundle size, supply-chain trust, and offline-first
  behavior depend on a small, pinned, self-hosted runtime surface.
- Applies to: `package.json` runtime dependencies, `public/fonts/`, new
  integrations (analytics, OAuth SDKs, monetization).
- Evidence: CLAUDE.md "No new runtime dependencies" hard convention;
  REPOSITORY_STATE RF-010 + AD-002; `package.json` dependencies.
- Change authority: owner decision, recorded before the dependency lands.

## AI-005 — Server env access via Cloudflare Workers bindings only

- Rule: always `import { env } from 'cloudflare:workers'`. Never use
  `locals.runtime.env` (removed in `@astrojs/cloudflare` v13+); never create a
  manual `src/env.d.ts` `Runtime` alias (the adapter self-injects `App.Locals`;
  a duplicate breaks `Locals` under `skipLibCheck`).
- Rationale: the adapter contract changed upstream; the two forbidden patterns
  throw at runtime or silently break `Locals` typing.
- Applies to: every Worker-side handler reading env (secrets, D1, Brevo).
- Evidence: CLAUDE.md "Server env access" hard convention;
  `src/lib/` and API endpoints using `import { env }`.
- Change authority: project owner + toolchain-upgrade decision (e.g. the
  `compressHTML` decision record in `15-astro-7-upgrade`).

## AI-006 — Flat architecture only

- Rule: code lives only in `src/{components,pages,lib,data,layouts,styles}`.
  No DDD/domain layers; new directories require an explicit owner decision.
- Rationale: small-team maintainability and the game's single-page core;
  a domain split adds ceremony without current benefit.
- Applies to: `src/`, future source trees.
- Evidence: CLAUDE.md "Flat architecture" hard convention; `src/` layout;
  REPOSITORY_STATE RF-006.
- Change authority: owner decision (project-wide authority above).

## AI-007 — Dynamic routes must declare `prerender = false`

- Rule: every API/server-rendered page exports `export const prerender = false;`
  — without it Astro tries to prerender the route and it breaks.
- Applies to: `src/pages/api/*`, any server-rendered route.
- Evidence: CLAUDE.md "Every dynamic route" hard convention.
- Change authority: owner decision (project-wide authority above).
