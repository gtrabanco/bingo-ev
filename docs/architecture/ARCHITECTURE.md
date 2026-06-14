# Architecture

## Pattern

**Flat, offline-first single-page app with a best-effort serverless backend.** No DDD,
no domain layers, no MVC. The whole game is one Astro page (`src/pages/index.astro`)
whose client `<script>` orchestrates pure logic extracted into `src/lib/`. The server
side is a thin set of Astro API routes on Cloudflare Workers backed by D1, used only to
make diplomas *verifiable* and cards *watchable* — never required for play.

The driving constraint: **the game must keep working with the Worker down.** The client
is the source of truth for play; the server is the source of truth for verification.

## Modules / layers

Only these folders exist under `src/` (adding a new top-level folder is an architecture
change):

| Module / layer | Responsibility | May depend on | Must NOT depend on |
|---|---|---|---|
| `lib/` | Pure logic: card generation/validation/expiry (`card.ts`), win detection (`wins.ts`), localStorage (`storage.ts`), API client (`api.ts`), group helpers (`groups.ts`), certificate/QR/OG/confetti render | other `lib/`, `data/` | `components/`, `pages/` |
| `data/` | The situation pool (`situations.json`) — single source of truth for card content | — | everything |
| `components/` | Static `.astro` frames (`BingoCard`, `CertificateModal`) | `lib/`, `data/` | `pages/` |
| `pages/` | Routes: the game (`index.astro`), spectator/group/verify pages, API endpoints | `lib/`, `components/`, `data/` | — |
| `layouts/`, `styles/` | HTML shell + Tailwind theme/global CSS | — | — |

`lib/groups.ts` and `lib/card.ts` import `cloudflare:workers` only for the server-side
helpers; the pure functions (geometry, marks, expiry) are isomorphic and shared by both
the browser bundle and the Worker.

## Dependency rules (invariants)

- **`lib/` is the bottom layer.** It never imports from `components/` or `pages/`.
- **Win logic comes only from `ROWS`/`COLS`** (`lib/card.ts`), never from the rendered
  grid or a runtime column count. Portrait is a CSS-only transpose; the data model is
  always canonical landscape 3×4.
- **Server env only via `import { env } from 'cloudflare:workers'`** — never
  `locals.runtime.env`, never a hand-written `src/env.d.ts`.
- **The client must degrade gracefully.** Every `api.ts` call returns `null`/`false` on
  failure (4 s timeout); no feature may hard-depend on the API succeeding.
- **Identity = card id + owner secret.** The alias is a label, never an identifier.
  Group ownership is a card (`groups.owner_card_id`), not a browser token.
- **Group/card mutations re-check state inside the SQL** (atomic `UPDATE`/claim with
  guards), never read-then-write. Any path that deletes a card or unlinks it from a
  group must run `settleDeparture` (see `lib/groups.ts`).
- **Every dynamic route** exports `prerender = false`.

## Diagram

```
data/situations.json
        │
        ▼
      lib/  ──────────────┐  (pure: card, wins, storage, groups isomorphic helpers)
   ▲    │                 │
   │    ▼                 ▼
components/           pages/ (index.astro game + API routes)
                          │  best-effort, same-origin
                          ▼
                   Cloudflare D1  (cards, groups)
```
