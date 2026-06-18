# 09 — gallery-profiles

## Goal

A public, per-player profile page that aggregates all of one player's completed
diplomas under a single chosen handle, plus an "N bingos del mismo jugador" counter
on each `/galeria` entry that links to that profile. This is the cross-card identity
surface that `03 public-gallery` deliberately deferred: the gallery lists *cards*;
this feature, for the first time, lists *a person* — but only one who has explicitly
opted in and picked a public handle, so the durable identity from `05 accounts` is
exposed by consent, never automatically.

## Branch

`feat/09-gallery-profiles`

## Size

`M` — phased work: schema migration, a profile read/write endpoint with handle
validation, a new SSR profile page, gallery integration for the counter, an
opt-in UI control, and a `/privacidad` update. Full artifact set.

## Dependencies

- **Hard:** `03 public-gallery` (**merged**) — the profile reuses the gallery's
  honorific seals, `queryGallery` patterns, and the `/v/{id}` link target. The
  counter lives on gallery entries.
- **Hard:** `05 accounts` (**merged**) — the profile *is* an account. Aggregation
  is `cards.account_id`; without it there is no durable cross-card identity (alias/
  nick is never an identifier — `docs/architecture/ARCHITECTURE.md`).

## Context

`03` shipped a gallery of individual diplomas and explicitly deferred the per-person
profile + "N bingos by the same player" counter, because the model then had no
durable identity (`03-public-gallery/SPEC.md`, D4). `05` then added optional accounts
(`accounts` table, `cards.account_id`). The two pieces now exist; `09` joins them.

The privacy step is real and larger than the gallery's. The gallery exposes *cards*
that were already public by URL; discoverability was the only new processing. A
profile **aggregates** multiple diplomas under one identity and asserts "this is one
person with N bingos" — a new, stronger purpose. Because the account's
`display_name` is the player's **real Google/X name**, the profile must never expose
it. The player picks a separate public **handle**; the profile is **opt-in**.

## Business goals

- Reward returning/multi-diploma players with a shareable identity — a personal
  trophy cabinet that drives re-shares (each profile is its own social link).
- Make the gallery feel inhabited ("este jugador tiene 7 bingos") without naming
  real people, reinforcing the parody.

## Technical goals

- Expose cross-card identity **only by opt-in**, never weakening the rule that nick/
  alias is not an identifier — the identifier is the player-chosen, unique handle.
- Keep the offline-first boundary: the profile page and counter degrade like the
  rest of `src/lib/api.ts` (empty/`null` on failure); the game never depends on them.
- Reuse `03`'s `queryGallery`/honorific/seal logic; do not re-derive honorific from
  rendered state. No real name (`accounts.display_name`) ever crosses the wire to a
  public surface.

## Scope

### In scope

- Schema migration `0013_profiles.sql`: add `accounts.public_handle TEXT UNIQUE`
  (nullable) and `accounts.profile_public INTEGER NOT NULL DEFAULT 0`.
- New SSR page `/jugador/[handle].astro` (`prerender = false`): a player's public
  profile — handle as the only label, total public-diploma count, honorific
  breakdown, and a newest-first grid of their listed diplomas each linking to
  `/v/{id}`. 404 when the handle is unknown or the profile is not public.
- New endpoint `POST /api/account/profile` (session-auth) `{handle, public}`:
  set/update the handle + visibility. Validates handle format, uniqueness, and the
  existing nick blocklist; typed errors (`422` invalid/blocked, `409` taken).
- Extend `GET /api/account` to return `publicHandle` and `profilePublic`.
- Gallery integration: each `/galeria` entry whose owning account has a **public**
  profile shows "N bingos" linking to `/jugador/{handle}`. Entries with no account,
  or a private profile, show nothing extra (unchanged appearance).
- Opt-in control in `index.astro`'s logged-in account bar: enable the public
  profile + choose/edit the handle, with inline validation errors.
- `/privacidad` update: the public profile as a new, opt-in processing purpose
  (handle is player-chosen, not the real name; how to disable; consent basis).

### Out of scope / non-goals

- **Auto-published profiles / opt-out** — explicitly rejected; profiles are opt-in
  (see Decisions D1).
- **Showing the real provider name anywhere public** — never; handle only.
- **Custom avatars / bios / profile theming** — handle + diploma grid only this
  iteration.
- **Profile editing of individual diplomas** — owned by the per-card flows already
  shipped (hide control in `03`).
- **Achievements/badges on the profile** — owned by `06 achievements-badges`; the
  profile can surface them later once they exist.
- **Following / social graph / comments** — not in this product.
- **Handle change history / vanity-URL redirects** — a handle change just updates
  the column; old URLs 404. No redirect table this iteration.

## Architecture impact

- **Flat architecture honored:** only `src/{pages,lib,data}` touched. Profile page
  and endpoint are `prerender = false`; server env via
  `import { env } from 'cloudflare:workers'`.
- **Identity invariant respected and extended carefully:** the public identifier is
  the **handle**, a deliberate opt-in label — not nick, not alias, not the real
  name. Nick/alias remain non-identifiers. The aggregation key is `account_id`
  (server-side only); it is never exposed in a URL.
- **Reuse over re-derive:** profile diploma list and the gallery counter reuse
  `queryGallery`/`honorificFor`/`HONORIFICS`; honorific is computed in the Worker,
  never from rendered grid state.
- **No real-name leak:** `accounts.display_name`/`email` must not appear in any
  response from a public surface (`/jugador/*`, the gallery counter). Only `handle`
  and derived diploma fields cross the wire.
- **Mutation auth:** setting the handle/visibility is an account mutation → requires
  the session cookie (`getSession`), same pattern as the other `/api/account/*`
  endpoints. No card secret involved (it is account-level, not card-level).
- **Input sanitization:** the handle is user free-text → trimmed, lowercased,
  control-chars stripped, length-capped, regex-validated, and blocklist-checked
  before any write (matches the project's server-sanitization rule).

## Design

### Data — migration `0013_profiles.sql`

```sql
ALTER TABLE accounts ADD COLUMN public_handle TEXT;
ALTER TABLE accounts ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX idx_accounts_public_handle ON accounts (public_handle);
```

- `public_handle` is nullable; `NULL` until the player picks one. SQLite treats
  multiple `NULL`s as distinct, so the unique index permits many accounts with no
  handle while enforcing uniqueness among set handles.
- A profile is **public** iff `profile_public = 1 AND public_handle IS NOT NULL`.
  The two columns let a player disable the profile without surrendering the handle.
- Additive and safe on live data; no backfill (every existing account starts with
  no handle, profile off). Apply `--local` before dev; remote via `npm run db:migrate`.

### Handle rules

- Pattern: `^[a-z0-9-]{3,24}$` (lowercase slug). The client lowercases and strips on
  input; the server re-validates (never trust the client).
- Uniqueness: enforced by the unique index; the endpoint maps the constraint error
  to `409 { error: "handle_taken" }`.
- Blocklist: reuse `checkNick()` from `src/lib/blocklist.ts` (the `reserved`/`nsfw`/
  `pattern` checks). A blocked handle → `422 { error: "<reason>" }` using the same
  messages as the gallery nick flow. (Note: the `@`/domain pattern checks are
  harmless here — the slug regex already excludes `@` and `.`.)

### Endpoint — `POST /api/account/profile`

- Session-auth (`getSession`); `401` when logged out.
- Body `{ handle: string, public: boolean }`.
- Normalize: `handle.trim().toLowerCase()`, strip control chars, cap to 24.
- Validate against the slug regex → `422 { error: "handle_invalid" }` on miss.
- Run `checkNick(handle)` → `422 { error: "Nombre reservado" | "Nombre inapropiado"
  | "Nombre no permitido" }` on block.
- `UPDATE accounts SET public_handle = ?, profile_public = ? WHERE id = ?`. On the
  unique-index violation → `409 { error: "handle_taken" }`.
- `204` on success. Idempotent (re-setting the same handle for the same account is
  fine — the row already owns it).

### Endpoint — `GET /api/account` (extended)

Add `publicHandle` and `profilePublic` to the existing JSON so the account bar can
render the profile control's current state. No new query — extend the existing
`SELECT` on `accounts`.

### Page — `/jugador/[handle].astro`

- `prerender = false`. Look up the account by handle:
  `SELECT id FROM accounts WHERE public_handle = ? AND profile_public = 1`.
  No row → `Astro.redirect` to a 404 / render the 404 layout (unknown or private
  handle are indistinguishable to the visitor — no existence leak of private handles).
- Diploma list reuses the gallery shape: `SELECT … FROM cards WHERE account_id = ?
  AND completed_at IS NOT NULL AND gallery_hidden = 0 ORDER BY completed_at DESC`,
  mapped via the same row→entry logic (honorific via `honorificFor`, blocklist nick
  suppression). A diploma the owner hid from the gallery is **also** hidden from the
  profile (consistent visibility).
- Renders: the handle as the title, total count ("7 bingos certificados"), an
  honorific breakdown (counts per tier reusing the seal colors), and the diploma
  grid (each entry → `/v/{id}`). Empty state if the player has a public profile but
  no *listed* diplomas (dry es-ES tone).
- **Indexable** (public, shareable) with canonical + OG; added to the sitemap is
  out of scope (handles are user data, not static routes) — rely on inbound links.
- Never renders `display_name`/`email`.

### Gallery integration — the "N bingos" counter

- Extend `GalleryEntry` (in `src/lib/gallery.ts`) with optional
  `profileHandle: string | null` and `siblingCount: number` (the count of the
  owning account's *listed* completed diplomas, ≥1).
- `queryGallery` LEFT JOINs `accounts` on `cards.account_id` and, when the account
  is public (`profile_public = 1 AND public_handle IS NOT NULL`), computes the
  sibling count. Cards with no account, or a private profile, get
  `profileHandle = null` and no counter.
- The gallery entry UI shows, when `profileHandle` is set and `siblingCount > 1`:
  "N bingos del mismo jugador" linking to `/jugador/{handle}`. Single-diploma
  public players (count = 1) show the handle link without an inflated counter
  (decision D3).

### UI — profile control in `index.astro`

In the logged-in account bar (next to "Cerrar sesión"), add a compact "Perfil
público" affordance:
- If `profilePublic` is off: a button "Crear perfil público" → reveals a handle
  input + "Activar" (POSTs `{handle, public:true}`).
- If on: shows the public handle as a link to `/jugador/{handle}`, an "editar"
  control to change it, and a toggle to disable (`{handle, public:false}`).
- Inline validation errors map the endpoint's typed errors to dry es-ES copy
  ("Ese nombre ya está cogido", "Nombre no permitido", etc.). Accessible
  (`aria-live`, labelled input, focus management) per `docs/frontend/ACCESSIBILITY.md`.

### Copy / privacy

`/privacidad` gains a subsection under the accounts section: the public profile is
**opt-in**, links your certified diplomas under a **handle you choose** (never your
Google/X name), is disablable at any time, and rests on **consent**. State that a
hidden diploma (gallery hide) is also absent from the profile.

## Decisions to confirm

> These three were chosen as defaults to unblock planning (the owner was asked but
> the work proceeded on recommendations). **Each can be overridden before P1 —
> revisit here, then `PLAN.md`/`TASKS.md` follow.**

- **D1 — Profile visibility: OPT-IN.** No profile is public until the player enables
  it and picks a handle. The gallery counter only appears for opted-in accounts.
  *Rationale:* aggregating a real-name-backed identity into "this person has N
  bingos" is a materially stronger processing purpose than the gallery's per-card
  discoverability; opt-in is the defensible GDPR posture and matches `05`'s "accounts
  are always optional" stance. *Alternative rejected:* opt-out (auto-publish), which
  would surface a real-name-linked identity without consent.
- **D2 — Public identifier: PLAYER-CHOSEN HANDLE** in `/jugador/{handle}`. Unique,
  slug-validated, blocklist-checked. *Rationale:* human-friendly and shareable, and
  it never leaks the real name (unlike `display_name`) nor is ugly/opaque (unlike
  `account_id`). *Alternatives rejected:* opaque `account_id` (unshareable), real
  name (privacy landmine, not unique).
- **D3 — Display label: THE HANDLE ITSELF** (one concept; same string in the URL,
  the profile title, and the gallery counter link). *Rationale:* one field to
  moderate, already blocklist-validated, never exposes the real name. *Alternative
  rejected:* a separate free-text display name (a second moderation surface for no
  clear benefit).

## Acceptance criteria

- Migration `0013_profiles.sql` applied: `accounts` has `public_handle` (unique,
  nullable) and `profile_public` (default 0).
- `POST /api/account/profile` with a valid, free handle and `public:true` →
  `204`; the account row has the handle and `profile_public = 1`.
- Same endpoint with a handle already owned by another account → `409
  { error: "handle_taken" }`; no write.
- A handle failing the slug regex → `422 { error: "handle_invalid" }`.
- A handle matching `reserved`/`nsfw`/`pattern` → `422` with the matching message.
- Logged-out call → `401`.
- `GET /api/account` returns `publicHandle` and `profilePublic`.
- `/jugador/{handle}` for a public handle renders the handle, the correct count of
  the account's listed completed diplomas, an honorific breakdown, and a grid each
  linking to `/v/{id}`.
- `/jugador/{handle}` for an unknown **or** private handle returns 404 (no
  distinction between the two).
- A diploma the owner hid from the gallery (`gallery_hidden = 1`) does not appear on
  the profile either.
- No public surface (`/jugador/*`, gallery counter, `/api/gallery`) ever returns
  `display_name` or `email`.
- A gallery entry whose account is public shows "N bingos del mismo jugador" linking
  to the profile; an entry with no account or a private profile shows no counter.
- The `index.astro` control creates, edits, and disables the public profile, showing
  the right state and inline errors; accessible.
- With the Worker unreachable, the profile page and counter degrade gracefully and
  the game is unaffected.
- `npm run build` green; `/privacidad` documents the opt-in profile, the handle, how
  to disable, and the consent basis.

## Testing requirements

No test suite/linter — `npm run build` (type-check) is the gate; the rest is manual
via `npm run dev` + the Claude Preview MCP. Apply `0013` `--local` before testing or
the new columns won't exist. Manual scenarios below.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `profile:create` | enabling a public profile | log in, open the account bar control, pick a free handle, activate → `204`, profile live |
| `profile:view` | a populated public profile | complete ≥2 cards while logged in, enable profile, visit `/jugador/{handle}` |
| `profile:empty` | public profile, no listed diplomas | enable profile with no completed (or all hidden) cards → empty-state page |
| `profile:private-404` | private/disabled profile is a 404 | set `public:false`, visit `/jugador/{handle}` → 404 |
| `profile:unknown-404` | unknown handle is a 404 | visit `/jugador/doesnotexist` → 404 (same response as private) |
| `profile:handle-taken` | uniqueness | two accounts try the same handle → second gets `409` |
| `profile:handle-invalid` | slug validation | submit `"Ab"` / `"a b"` / 30 chars → `422 handle_invalid` |
| `profile:handle-blocked` | blocklist reuse | submit `"gabriel"` → `422 Nombre reservado` |
| `profile:hidden-diploma` | gallery hide also hides on profile | hide one completed card, confirm it's absent from the profile |
| `profile:no-realname` | real name never leaks | inspect `/jugador/*` HTML + gallery JSON; assert no `display_name`/`email` |
| `gallery:counter` | the "N bingos" link on entries | with a public multi-diploma account, load `/galeria`, see the counter linking to the profile |
| `gallery:no-counter-private` | private accounts show no counter | a completed card on a private-profile account → no counter on its entry |
| `profile:degraded` | Worker down | stop the Worker; profile page renders empty/last-known, game unaffected |

## Phases

- **P0 — Planning:** this SPEC + `PLAN.md` + `TASKS.md` + `progress.md` +
  `testing.md`; roadmap registration.
- **P1 — Schema + profile API:** migration `0013_profiles.sql`; `POST
  /api/account/profile` (handle validation, uniqueness, blocklist, typed errors);
  extend `GET /api/account`; `src/lib/api.ts` client method + types. Gate.
- **P2 — Profile page:** `/jugador/[handle].astro` SSR aggregation (count,
  honorific breakdown, diploma grid, empty + 404 states), SEO/OG, no real-name leak.
  Gate.
- **P3 — Gallery counter + opt-in UI + privacy:** extend `GalleryEntry`/`queryGallery`
  with `profileHandle`/`siblingCount`; render the counter on entries; profile
  control in `index.astro`; `/privacidad` update. Gate.
- **P4 — Hardening + review:** companion review skills (code/security/verify/
  tech-debt + design/a11y/brand + web-perf/SEO); manual dev-scenario pass.
- **P5 — PR:** one PR against `main`, `Closes #<issue>`.

## Deploy & rollback

- **Migration order:** `0013_profiles.sql` before the endpoints/page ship.
  `npm run deploy` runs `db:migrate` (idempotent) then `wrangler deploy`; `--local`
  first for dev.
- **Rollback:** revert the PR. Columns are additive and inert if left in place; no
  data cleanup required (a left-behind handle column harms nothing).
- **No feature flag** — opt-in means nothing is public until a player acts, so the
  page/endpoint are safe to ship dark.

## Open questions / risks

- **Handle squatting:** a player could grab a desirable handle. Acceptable for a
  parody site; the blocklist covers the owner's names. No reservation system. ACCEPTED.
- **Profile of a public account that later deletes its account:** `DELETE
  /api/account` nulls `account_id` on cards and deletes the account row → the handle
  is freed and the profile 404s; orphaned diplomas fall back to plain gallery entries
  with no counter. Correct by construction; verify in P2/P3. VERIFY.
- **Counter cost on the gallery:** the LEFT JOIN + sibling count runs per listed
  page. The registry is tiny (`03` scale assumption); if it grows, precompute a
  per-account count. DEFERRED (noted, not built).
- **Indexability of profiles:** public profiles are indexable by design. A player
  disabling the profile 404s the URL; search engines drop it on recrawl. Accepted.

## Deliverables

- `migrations/0013_profiles.sql`.
- `src/pages/api/account/profile.ts` (`POST`); extended `src/pages/api/account/index.ts`.
- `src/pages/jugador/[handle].astro`.
- `src/lib/gallery.ts` (`profileHandle`/`siblingCount` on `GalleryEntry` + query),
  and the gallery entry UI (`/galeria` render) showing the counter.
- `src/lib/api.ts` additions (set-profile client method + types).
- Profile control wiring in `src/pages/index.astro`.
- `/privacidad` (`src/pages/privacidad.astro`) public-profile section.
- This artifact set + roadmap update (also correct `03` status to `done`).

## Post-merge next feature

Per `docs/features/ROADMAP.md`: `06 achievements-badges` (which can later surface
badges on the profile) or the quick win `07 situations-total-count`.
