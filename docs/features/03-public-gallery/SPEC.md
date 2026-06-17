# 03 — public-gallery

> Feature specification. The doc read at the start of the workflow.

## Goal

A public, browsable gallery of completed diplomas at `/galeria`. Today every
completed card is already public *by URL* (`/v/{id}`, `/c/{id}`, OG image) but is
**undiscoverable** — there is no listing. This feature aggregates completed
diplomas into a single filterable page so visitors can browse the collective
misery, sort/filter by honorific tier and vehicle type, and click through to any
individual `/v/{id}`. Listing is **opt-out** (every completed diploma appears
unless its owner hides it), with a nick wordlist and a takedown path as the
moderation backstop.

## Branch

`feat/03-public-gallery`

## Size

`M` — phased work: schema migration, a new listing endpoint, a new server-rendered
page with filters, an owner hide control, a moderation backstop, and a
`/privacidad` update. Full artifact set (`PLAN.md`, `TASKS.md`).

## Dependencies

- **Hard:** `01 final-certificate-design` (**done**). The gallery renders the
  honorific tier and seal finalized there (`honorificFor`, `HONORIFICS`), and the
  12-month retention rule defines the gallery's natural lifespan.
- **Soft / forward:** the **user profile + cross-card "N bingos by the same
  person" counter** is explicitly **out of scope** here and gated on
  `05 accounts` — see [Out of scope](#out-of-scope--non-goals). Tracked as roadmap
  entry `09 gallery-profiles`.

## Context

The shipped game already exposes every completed diploma publicly by URL, but a
visitor can only reach a diploma if someone hands them the link. There is no
"front door" to the collection — no way to discover diplomas, see how many exist,
or browse them. A public gallery turns the scattered, link-only diplomas into a
shareable centerpiece that also showcases the variety of desgracias and the
honorific tiers, reinforcing the parody.

The privacy-relevant change is **discoverability**: aggregating already-public
diplomas into a browsable, filterable list is a *new processing purpose* under
GDPR even though each diploma was already reachable by URL. The owner (data
controller) chose **opt-out** listing, so this SPEC treats disclosure
(`/privacidad`), an owner hide control, and a moderation backstop as mandatory
parts of the feature rather than nice-to-haves.

The request originally included a per-person profile aggregating all of a player's
bingos. That requires a durable cross-card identity that the current model
deliberately lacks (no accounts; alias/nick is "never an identifier" and not
unique — `docs/architecture/ARCHITECTURE.md`, `docs/domain/README.md`). Owner
decision: ship the gallery of individual diplomas now; defer the profile to depend
on `05 accounts`.

## Business goals

- Give the site a discoverable, shareable centerpiece that drives engagement and
  re-shares (each entry is its own social link).
- Showcase the breadth of desgracias and honorific tiers to reinforce the parody's
  premise without naming brands.

## Technical goals

- Add the first **aggregate read** over `cards` (everything else is by-id, by-email,
  or by-group), behind a single endpoint, without weakening the offline-first,
  best-effort boundary in `src/lib/api.ts`.
- Introduce per-card **gallery visibility** as additive schema, defaulting to
  listed (opt-out), with an owner-authorized toggle that reuses the existing
  secret-based mutation pattern.
- Keep filtering correct against the canonical honorific logic — never re-derive it
  from rendered state.

## Scope

### In scope

- New public page `/galeria` (`src/pages/galeria.astro`, `prerender = false`):
  server-rendered grid of completed, non-hidden diplomas, newest first.
- Each entry: **nick** (fallback label when null), **honorific seal + tier label**,
  **completion date**, **vehicle_type** (when set), linking to `/v/{id}`. Text/seal
  card only — **no per-entry diploma image**.
- Filters: **honorific tier** (resignado / granujilla / sinvergüenza) and
  **vehicle_type**; plus a **total count** of listed diplomas (and per-filter count).
- Pagination over the listed set (newest first).
- New endpoint `GET /api/gallery` returning a page of listed diplomas + counts,
  degrading to empty/`null` on failure like the rest of `src/lib/api.ts`.
- Schema: migration `0010_gallery.sql` adds `cards.gallery_hidden INTEGER NOT NULL
  DEFAULT 0` (0 = listed, 1 = hidden).
- Owner **hide/unhide** control: endpoint `POST /api/cards/[id]/gallery`
  (`{secret, hidden}`) + a toggle on the owner's completed-card view in
  `index.astro`.
- Moderation backstop: a **two-category nick blocklist** (`src/data/blocklist.json`):
  - **`reserved`** — terms similar to the site owner's name ("gabriel", "trabanco",
    "gtrabanco", "gruxon", …). Rejected at nick-write time with the Spanish error
    message `"Nombre reservado"`. The gallery also suppresses any pre-existing nick
    that matches at read time.
  - **`nsfw`** — es-ES profanity/slur terms. Rejected at nick-write time with
    `"Nombre inapropiado"`. Same read-time gallery suppression as fallback.
  - Enforcement is **primarily at write time** (the endpoints that accept a nick:
    `POST /api/cards/[id]/complete` and any future nick-update endpoint) so the
    player sees the reason immediately and can choose a different name. Gallery
    suppression is the secondary fallback for nicks that pre-date the blocklist.
  - A **report/takedown contact** documented in `/privacidad`; operator takedown
    performed by setting `gallery_hidden = 1` via `wrangler d1 execute`.
- `/privacidad` update: disclose the gallery as a new purpose (discoverability of
  completed diplomas), the opt-out nature, how to hide, and the takedown contact.

### Out of scope / non-goals

- **Per-person profile / cross-card counter** ("N bingos by the same player", click
  a user to see all their diplomas) — needs durable identity; owned by `09
  gallery-profiles`, gated on `05 accounts`.
- **Per-entry diploma image thumbnails** — text/seal cards only this iteration
  (image fan-out + caching deferred; revisit if visually warranted).
- **Search by free text / nick search** — only structured filters (honorific,
  vehicle_type) this iteration.
- **Admin moderation UI / accounts-based reporting** — operator takedown is manual
  (D1) this iteration; owned by `05 accounts` if/when an admin surface exists.
- **Listing incomplete or expired cards** — only `completed_at IS NOT NULL`.
- **Automated profanity ML / multi-language filters** — a small static es-ES blocklist only; the takedown path is the backstop for anything the list misses.
- **Nick-update endpoint** — blocking is applied on `POST /api/cards/[id]/complete`
  (the only current nick-write path); if a dedicated nick-update endpoint is added
  later, it must apply the same check.

## Architecture impact

- **New aggregate query.** First `SELECT` over `cards` not scoped by id/email/group.
  Confined to `GET /api/gallery`; the client path stays in `src/lib/api.ts` and must
  degrade to `[]`/`null` on failure (4 s `AbortSignal.timeout`), preserving the
  offline-first invariant.
- **Flat architecture honored:** only `src/{pages,lib,data}` touched. Page is
  `prerender = false`; server env via `import { env } from 'cloudflare:workers'`.
- **Identity invariant honored:** the gallery lists *cards*, never *people*. No
  grouping by nick/alias; nick stays a display label. The profile aggregation that
  would cross that line is deferred (see non-goals).
- **Honorific from canonical logic:** tier computed via `honorificFor(cells, marks)`
  in the Worker, never from rendered grid state.
- **Input sanitization:** the hide endpoint follows the server sanitization +
  secret-auth pattern; no new user free-text is stored. The two-category blocklist
  (`reserved` / `nsfw`) is enforced **at write time** on nick-accepting endpoints,
  returning the appropriate message (`"Nombre reservado"` / `"Nombre inapropiado"`)
  so the player can correct the name before it is saved. Gallery suppression is a
  secondary read-time fallback for pre-existing nicks.
- **Mutation auth:** hide/unhide is an owner mutation → requires the card secret,
  same-origin, exactly like `complete`/`marks`/`alias`.

## Design

### Data

Migration `0010_gallery.sql`:

```sql
ALTER TABLE cards ADD COLUMN gallery_hidden INTEGER NOT NULL DEFAULT 0;
```

Opt-out: existing and future completed cards are listed (`0`) until the owner (or
the operator, for takedown) sets `1`. No backfill needed — the default lists every
pre-existing completed diploma, which is the chosen behavior. Apply locally with
`npx wrangler d1 migrations apply ev-bingo --local` before dev testing; remote via
`npm run db:migrate`.

### Listing query & filtering

The completed-card registry is **deliberately tiny** (completed cards retained 12
months; low-traffic parody site), so the gallery favors correctness and simplicity
over index gymnastics:

```sql
SELECT id, nick, completed_at, marks, cells, vehicle_type
FROM cards
WHERE completed_at IS NOT NULL AND gallery_hidden = 0
  [AND vehicle_type = ?]            -- when a vehicle filter is set
ORDER BY completed_at DESC
LIMIT ? OFFSET ?;
```

- **vehicle_type** and **completed_at** filter/sort in SQL (real columns).
- **honorific tier** is computed per row in the Worker via `honorificFor(cells,
  marks)` (cannot be expressed cleanly over the packed `marks` string in SQL). When
  an honorific filter is active, the Worker filters the fetched rows.
- **nick wordlist** suppression also applies in the Worker (a matched nick is
  dropped from the page as if hidden).
- **Counts:** total listed count and per-honorific / per-vehicle counts are computed
  by the Worker over the listed set (cheap at this scale). State the scale
  assumption in code; if the registry ever grows, promote honorific to a stored
  `caused_count` column (noted as future optimization, not built now).

Pagination: offset/limit with a fixed page size (e.g. 24) and a hard server cap on
`limit`/`offset`. Because honorific/wordlist filtering happens after the SQL page,
a page may render slightly fewer than the page size; the endpoint over-fetches a
bounded window to compensate and reports `hasMore`. Acceptable at this scale.

### Endpoint — `GET /api/gallery`

- Query params: `?page=N&honorific=resignado|granujilla|sinverguenza&vehicle=<enum>`.
- Returns `{ items: GalleryEntry[], total, counts: { honorific, vehicle }, hasMore }`.
- `GalleryEntry`: `{ id, nick, completedAt, honorific, vehicleType }` — **no marks/
  cells leak**; only the derived honorific and display fields cross the wire.
- `prerender = false`; read-only; no secret required (public data).

### Endpoint — `POST /api/cards/[id]/gallery`

- Body `{ secret, hidden: boolean }`. Verifies the card exists, is completed, and
  the secret matches (same pattern as `complete.ts`). Sets `gallery_hidden`.
- Degrades to `false` on the client (`src/lib/api.ts`) like other mutations.

### Page — `/galeria`

- Server-renders the first page (SEO-friendly, works with JS off); filters and
  pagination enhance client-side via `src/lib/api.ts`.
- Reuses the honorific seal/colors from `certificate-design.ts` for each entry.
- Empty state ("aún no hay diplomas…", dry tone, es-ES) when the listed set is
  empty. SEO metadata + a gallery entry in the sitemap (per `docs/frontend/SEO.md`).

### Owner hide control

- On the owner's completed-card view in `index.astro`, a toggle "Mostrar en la
  galería pública / Ocultar de la galería" reflecting `gallery_hidden`, calling the
  hide endpoint with the stored secret. Dry, clear es-ES copy; accessible toggle.

### Moderation

**Blocklist shape** — `src/data/blocklist.json`:

```json
{
  "reserved": ["gabriel", "trabanco", "gtrabanco", "gruxon"],
  "nsfw": ["<es-ES terms>"]
}
```

Three categories with distinct write-time error responses:

| Category | Reason | HTTP status | Body `error` |
|---|---|---|---|
| `reserved` | Owner-name-similar; impersonation prevention | 422 | `"Nombre reservado"` |
| `nsfw` | es-ES profanity/slur | 422 | `"Nombre inapropiado"` |
| `pattern` | Contains `@` (social handle) or a domain pattern | 422 | `"Nombre no permitido"` |

Pattern rules are **regex-based**, not wordlist entries — they live in `checkNick()`
directly, not in `blocklist.json`:

- **Social handle:** `/@/` — any nick containing `@` is rejected (covers
  `@usuario`, `usuario@red`, email-shaped strings, etc.).
- **Domain:** `/\.[a-z]{2,}(\/|$)/i` — any nick containing a TLD-like segment
  (`.com`, `.es`, `.net`, `.io`, `/subdomain.tld`, etc.) is rejected. The pattern
  requires the dot to be followed by ≥2 letters and then a slash or end of string,
  so innocent dots (abbreviations, initials) do not trigger it.

Pattern checks run **before** wordlist checks. No normalization is applied to the
raw nick for pattern matching (the `@` and `.` are literal characters).

**Enforcement order:**
1. **Write-time (primary):** `POST /api/cards/[id]/complete` applies pattern checks
   then wordlist checks before the `UPDATE`. On a match, return 422 with the
   appropriate message; the nick is **not** saved and the player can retry with a
   different name. Bingo completion is not blocked — only the nick is rejected; the
   client prompts the player to choose another name without losing their win.
2. **Read-time (fallback):** `GET /api/gallery` and `/galeria` server render suppress
   any matching nick from results (as if `gallery_hidden = 1`) to catch pre-existing
   nicks that predated the rules. Do **not** delete or mutate the stored nick.

Normalization (for wordlist checks only):
`nick.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')`.
A reserved/nsfw check is a simple `.some(term => normalized.includes(term))`.

**Operator takedown:** manual `UPDATE cards SET gallery_hidden = 1 WHERE id = ?`
via `wrangler d1 execute` (no admin UI this iteration).

**`/privacidad`:** new section documenting the gallery purpose, opt-out, how to
hide your own diploma, the blocklist reason ("reservamos algunos nombres para
garantizar la integridad del sitio"), and the takedown contact
(`hola@gtrabanco.com`).

## Decisions to confirm

All resolved with the owner (data controller) during planning:

- **D1 — Listing model: opt-out** (listed by default; owner/operator can hide).
  Rationale: owner wants a populated gallery from day one; diplomas are already
  public by URL, so the incremental exposure is discoverability, mitigated by the
  hide control + takedown + disclosure.
- **D2 — Size/scope: filterable (M)** — honorific + vehicle_type filters and counts.
- **D3 — Entry content: text/seal card + link**, including vehicle_type; no image
  thumbnails.
- **D4 — Profile/counter deferred** to `09 gallery-profiles` (gated on `05
  accounts`); the gallery lists cards, not people, preserving the identity
  invariant.
- **D5 — Moderation: owner hide flag + report/takedown path AND a two-category
  nick blocklist** (`reserved` / `nsfw`), both per owner. Enforcement is primarily
  at write time on nick-accepting endpoints (different 422 message per category);
  gallery suppression is the read-time fallback. Operator takedown is manual D1; no
  admin UI yet.

## Acceptance criteria

- `/galeria` lists every completed card with `gallery_hidden = 0`, newest first,
  each linking to `/v/{id}`; entries show nick (or fallback), honorific seal+label,
  completion date, and vehicle_type when set.
- Filtering by honorific tier and by vehicle_type returns only matching entries;
  the displayed total/counts match the filtered set.
- A completed card with `gallery_hidden = 1` never appears in `/galeria` or
  `GET /api/gallery`.
- The owner of a completed card can hide and un-hide it from `index.astro`; the
  change is reflected on `/galeria` after refresh.
- Submitting a nick containing `@` returns HTTP 422 `{ error: "Nombre no permitido" }`;
  nick unsaved, bingo unblocked.
- Submitting a nick containing a domain pattern (e.g. `algo.com`, `x.es/foo`) returns
  HTTP 422 `{ error: "Nombre no permitido" }`; nick unsaved, bingo unblocked.
- Submitting a nick that matches the `reserved` list returns HTTP 422
  `{ error: "Nombre reservado" }`; nick unsaved, bingo unblocked.
- Submitting a nick that matches the `nsfw` list returns HTTP 422
  `{ error: "Nombre inapropiado" }`; nick unsaved, bingo unblocked.
- A card whose stored nick matches any of the above does not appear in the gallery
  (read-time fallback suppression).
- `GET /api/gallery` never returns `marks` or `cells`; only derived fields.
- With the Worker unreachable, `/galeria` degrades gracefully (empty/last-known) and
  the rest of the game is unaffected.
- Incomplete/expired cards never appear.
- `npm run build` is green; `/privacidad` documents the gallery, opt-out, hide
  control, and takedown contact.

## Testing requirements

No test suite/linter exists — `npm run build` (type-check) is the gate; the rest is
manual via `npm run dev` + the Claude Preview MCP. Verify in a browser:

- Happy path: complete ≥3 cards spanning all honorific tiers and ≥2 vehicle types;
  confirm they appear, filters narrow correctly, counts match, links resolve.
- Hide path: hide one as its owner → disappears from gallery and `/api/gallery`;
  un-hide → reappears.
- Pattern (social handle): nick `@miusuario` → 422 `"Nombre no permitido"`, win saved.
- Pattern (domain): nick `compra.com` or `t.me/algo` → 422 `"Nombre no permitido"`, win saved.
- Pattern (innocent dot): nick `Sr. Sufre` or `J.A.` must NOT be rejected (dot not followed by TLD + boundary).
- Blocklist (reserved): nick "gabriel" → 422 `"Nombre reservado"`, win saved.
- Blocklist (nsfw): nick with a slur → 422 `"Nombre inapropiado"`, win saved.
- Read-time fallback: manually insert a matching nick via D1 → absent from `/galeria` and `/api/gallery`.
- Privacy: no `marks`/`cells` in the `/api/gallery` response (check Network tab).
- Degraded: stop the Worker / simulate timeout → page renders empty state, game
  still playable.
- Apply migration `--local` before testing or `gallery_hidden` won't exist.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `gallery:populated` | a non-empty gallery across tiers/vehicles | complete several local cards (existing completion flow) with varied marks + vehicle_type |
| `gallery:empty` | empty/first-run gallery | fresh local D1 with no completed cards → empty state |
| `gallery:hidden` | owner-hidden diploma excluded | toggle hide on `index.astro` for an owned completed card |
| `gallery:reserved-nick` | reserved-name rejection at write time | attempt completion with nick "gabriel" → 422 "Nombre reservado"; win still saved |
| `gallery:nsfw-nick` | nsfw rejection at write time | attempt completion with a slur → 422 "Nombre inapropiado"; win still saved |
| `gallery:social-nick` | social-handle rejection at write time | nick "@usuario" → 422 "Nombre no permitido"; win still saved |
| `gallery:domain-nick` | domain rejection at write time | nick "spam.com" → 422 "Nombre no permitido"; win still saved |
| `gallery:innocent-dot` | dot that must NOT trigger domain check | nick "Sr. Sufridor" → accepted (dot not TLD-shaped) |
| `gallery:blocked-read-fallback` | read-time suppression for pre-existing blocked nicks | insert a matching nick directly in D1; confirm absent from gallery |
| `gallery:degraded` | Worker down / API timeout | stop dev Worker or force the 4 s timeout; page degrades, game unaffected |
| `gallery:filtered` | honorific/vehicle filters | apply each filter; counts and items match |

## Phases

- **P0 — Planning:** this SPEC + `PLAN.md` + `TASKS.md`; roadmap registration.
- **P1 — Schema + read API:** migration `0010_gallery.sql`; `GET /api/gallery` with
  filtering, counts, pagination, honorific computation, wordlist suppression;
  `src/lib/api.ts` client + types. Gate.
- **P2 — Gallery page:** `/galeria.astro` server-render + client filters/pagination,
  seals, empty state, SEO/sitemap. Gate.
- **P3 — Owner hide + moderation + privacy:** `POST /api/cards/[id]/gallery`, hide
  toggle in `index.astro`, `blocklist.json`, `/privacidad` update. Gate.
- **P4 — Hardening + review:** companion review skills (code/security/verify/
  tech-debt + design/a11y/brand + web-perf/SEO); manual dev-scenario pass.
- **P5 — PR:** one PR against `main`, `Closes #<issue>`.

## Deploy & rollback

- **Migration order:** `0010_gallery.sql` must be applied before the endpoints ship.
  `npm run deploy` runs `db:migrate` (idempotent) then `wrangler deploy`. Apply
  `--local` first for dev.
- **Rollback:** revert the PR. The added column is additive and harmless if left in
  place; no data cleanup required (a left-behind `gallery_hidden` column is inert).
- **No feature flag** — opt-out listing means the gallery is live on merge. If a
  staged rollout is wanted later, gate the page render, not the schema.

## Open questions / risks

- **Retroactive listing of pre-existing diplomas (opt-out):** completed cards made
  before the gallery existed become listed on merge. Mitigation: disclosure in
  `/privacidad`, owner hide control, takedown path; owner (controller) explicitly
  accepted this. RESOLVED (D1).
- **Profile aggregation correctness:** deferred to `09`/`05` to avoid violating the
  identity invariant. RESOLVED (D4).
- **In-app honorific filtering at scale:** fine for the tiny registry; if it grows,
  promote to a stored `caused_count` column. DEFERRED (noted in Design).
- **Wordlist completeness:** a small static list won't catch everything; the
  takedown path is the backstop. Accepted for a solo-run parody site.
- **Counts vs pagination interaction:** post-SQL filtering can make a page shorter
  than the page size; the endpoint over-fetches a bounded window and reports
  `hasMore`. Verify the boundary in P1.

## Deliverables

- `migrations/0010_gallery.sql`.
- `src/pages/api/gallery.ts` (`GET`), `src/pages/api/cards/[id]/gallery.ts` (`POST`).
- `src/pages/galeria.astro`.
- `src/data/blocklist.json`.
- `src/lib/api.ts` additions (gallery fetch + hide) and shared types.
- Hide toggle wiring in `src/pages/index.astro`.
- `/privacidad` (`src/pages/privacidad.astro`) gallery + takedown section.
- Sitemap/SEO entry for `/galeria`.
- This artifact set + roadmap update; roadmap entry `09 gallery-profiles` recorded.

## Post-merge next feature

Per `docs/features/ROADMAP.md`: `04 analytics` and `05 accounts` are independent;
the gallery's deferred profile/counter lands as `09 gallery-profiles` once `05
accounts` provides durable identity.
