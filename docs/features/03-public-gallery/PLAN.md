# 03 — public-gallery · PLAN

> Phase-level execution plan derived from `SPEC.md`. One phase per commit, each
> gate-verified (`npm run build` green). Detailed checkboxes live in `TASKS.md`.

## Approach

Build bottom-up: schema → read API → page → owner/moderation/privacy → hardening →
PR. Each phase is independently gate-passing. The aggregate read and the opt-out
visibility flag are the two new architectural elements; everything else reuses
existing patterns (secret-auth mutation, honorific/seal rendering, `api.ts`
degradation, `prerender = false`).

## Invariants to hold (from SPEC + CLAUDE.md)

- Offline-first: every new `api.ts` call degrades to `[]`/`null`/`false` (4 s
  timeout). The game must work with the Worker down.
- Server env via `import { env } from 'cloudflare:workers'`; every new route
  `export const prerender = false`.
- Honorific from `honorificFor(cells, marks)` — never from rendered grid.
- Gallery lists **cards, not people** — no grouping by nick/alias.
- `GET /api/gallery` never returns `marks`/`cells` — only derived display fields.
- Hide is an owner mutation → card secret required, same-origin.
- UI strings es-ES, dry tone, **no brand names** (vehicle_type enum values are
  user self-identification, the documented exception).

## Phases

### P1 — Schema + read API
- `migrations/0010_gallery.sql`: `ALTER TABLE cards ADD COLUMN gallery_hidden
  INTEGER NOT NULL DEFAULT 0`.
- `GET /api/gallery` (`src/pages/api/gallery.ts`): SQL by `completed_at IS NOT NULL
  AND gallery_hidden = 0`, optional `vehicle_type =`, `ORDER BY completed_at DESC`,
  bounded over-fetch window; Worker computes honorific per row, applies honorific
  filter + wordlist suppression, builds counts, paginates, returns
  `{ items, total, counts, hasMore }` with display-only fields.
- `src/lib/api.ts`: `fetchGallery(params)` + `GalleryEntry`/response types,
  degrading to an empty result on failure.
- **Gate.** Manual: hit the endpoint locally (after `--local` migration) with/without
  filters; confirm no `marks`/`cells` in the payload.

### P2 — Gallery page
- `src/pages/galeria.astro` (`prerender = false`): server-render first page; entries
  as honorific-seal text cards (nick/fallback, tier label, completion date,
  vehicle_type) linking to `/v/{id}`; total + per-filter counts.
- Client filters (honorific, vehicle) + pagination via `fetchGallery`; empty state;
  SEO metadata + sitemap entry (`docs/frontend/SEO.md`).
- **Gate.** Manual via Preview MCP: populated, empty, filtered, degraded.

### P3 — Owner hide + moderation + privacy
- `POST /api/cards/[id]/gallery` (`{secret, hidden}`): verify exists + completed +
  secret; set `gallery_hidden`. `api.ts` `setGalleryHidden(...)` → `false` on fail.
- `index.astro`: accessible hide/unhide toggle on the owner's completed-card view.
- `src/data/blocklist.json`: two categories — `reserved` (owner-name-similar: "gabriel",
  "trabanco", "gtrabanco", "gruxon", …) and `nsfw` (es-ES profanity/slurs).
- `checkNick()` helper: pattern checks first (raw nick: `/@/`, `/\.[a-z]{2,}(\/|$)/i`
  → `"Nombre no permitido"`), then wordlist checks (normalized nick: `reserved` →
  `"Nombre reservado"`, `nsfw` → `"Nombre inapropiado"`). Shared between write-time
  and read-time. Verify innocent-dot edge case does not false-positive.
- Write-time enforcement in `POST /api/cards/[id]/complete`: 422 with category-
  specific message (`"Nombre reservado"` / `"Nombre inapropiado"`); win is still
  recorded without the nick; player can retry with a different name.
- Confirm P1 gallery endpoint consumes the same helper at read time as fallback for
  pre-existing matching nicks.
- `/privacidad`: gallery purpose, opt-out, how to hide, blocklist reason, takedown contact.
- **Gate.** Manual: hide/unhide round-trip; blocked-nick suppression.

### P4 — Hardening + review
- Run companion review skills: `code-review`, `security-review`, `verify`,
  `tech-debt`; UI: `design-review`, `accessibility-review`, `brand-review`; web:
  `web-perf` + SEO. Walk every `Dev scenario`.
- Resolve findings or track them (no silent skips).

### P5 — PR
- One PR against `main`, branch `feat/03-public-gallery`, `Closes #<issue>`.
- English PR body; note the migration so reviewers run `db:migrate`.

## Risks carried into execution

- Post-SQL filtering shortening a page — verify over-fetch/`hasMore` boundary in P1.
- Retroactive listing on merge — disclosure/hide/takedown are the mitigations
  (P2/P3); confirm `/privacidad` is updated before merge.
- Wordlist is best-effort — takedown path is the backstop.
