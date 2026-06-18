# 09 — gallery-profiles · PLAN

> How the SPEC is built, layer by layer, phase by phase. Tasks are in `TASKS.md`.

## Approach

The feature joins two merged surfaces (`03` gallery, `05` accounts) with the
smallest additive schema possible: two columns on `accounts`. Everything else is
read/write glue plus one new SSR page. Build inner-out: schema → API → page →
gallery integration + UI → privacy. The identity-sensitive rule (never leak the real
name; opt-in only) is enforced at the API/page boundary, not retrofitted later.

## Layer map (per `docs/architecture/ARCHITECTURE.md`, flat)

| Layer | Files | Notes |
|---|---|---|
| Persistence | `migrations/0013_profiles.sql` | `public_handle` (unique, nullable) + `profile_public` |
| Domain/logic | `src/lib/gallery.ts`, reuse `src/lib/blocklist.ts`, `src/lib/card.ts` | handle validation helper; extend `GalleryEntry` + `queryGallery` |
| Endpoint | `src/pages/api/account/profile.ts`, `src/pages/api/account/index.ts` | session-auth; typed errors |
| Client | `src/lib/api.ts` | `setProfile()` + types, degrade to `false`/`null` |
| Page | `src/pages/jugador/[handle].astro` | SSR aggregation, 404 = unknown∪private |
| UI | `src/pages/index.astro` | profile control in the account bar |
| Legal | `src/pages/privacidad.astro` | opt-in profile disclosure |

## Phase sequencing

- **P1 — Schema + profile API.** Migration; handle validation (slug regex +
  `checkNick`); `POST /api/account/profile` with `409`/`422`/`401`; extend `GET
  /api/account`; client method. The whole write/validation path lands here so P2/P3
  consume a stable contract.
- **P2 — Profile page.** `/jugador/[handle].astro`: lookup (public-only), diploma
  aggregation reusing gallery row→entry logic, count + honorific breakdown, empty +
  404 states, OG/canonical, no real-name leak.
- **P3 — Gallery counter + opt-in UI + privacy.** Extend `GalleryEntry`/`queryGallery`
  with `profileHandle`/`siblingCount`; render the counter on `/galeria` entries; the
  `index.astro` profile control (create/edit/disable, inline errors, a11y);
  `/privacidad` subsection.
- **P4 — Hardening + review.** Run companion reviews; manual dev-scenario pass
  (especially `profile:no-realname`, `profile:private-404`, `profile:hidden-diploma`).
- **P5 — PR.** One PR vs `main`, `Closes #<issue>`.

## Key implementation decisions

- **"Public" = `profile_public = 1 AND public_handle IS NOT NULL`** everywhere — one
  predicate, used by the page lookup, the gallery JOIN, and the counter gate.
- **404 = unknown ∪ private** — the page returns the same 404 for an unknown handle
  and a private one, so private handles can't be probed.
- **Profile visibility tracks gallery hide** — the profile reuses `gallery_hidden = 0`,
  so a hidden diploma is consistently absent from both gallery and profile.
- **No real name on the wire** — the profile/gallery queries select only handle +
  derived diploma fields; `display_name`/`email` never join a public response.
- **Reuse `queryGallery` mapping** — factor the row→entry mapping so the profile and
  the gallery share honorific/blocklist logic rather than duplicating it.

## Risks carried into execution

- LEFT JOIN sibling count cost (tiny registry; deferred precompute).
- Account deletion frees the handle and 404s the profile — verify in P2/P3.
- Slug regex vs blocklist `pattern` overlap — harmless; slug already excludes `@`/`.`.
