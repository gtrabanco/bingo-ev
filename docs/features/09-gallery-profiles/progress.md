# 09 — gallery-profiles · Progress

## P0 — Planning ✅

- SPEC, PLAN, TASKS, testing drafted. Registered in `docs/features/ROADMAP.md`
  (row 09; also corrected row 03 `planned → done` — it was merged).
- Dependencies verified merged: `03 public-gallery` and `05 accounts` are both on
  `main`.
- **Three product decisions taken as documented defaults** (owner asked; work
  proceeded on recommendations — overridable before P1): D1 opt-in profile, D2
  player-chosen handle in `/jugador/{handle}`, D3 handle is also the display label.
  See SPEC "Decisions to confirm".

**Left open for P1:** schema migration + profile write/read API.

## P1 — Schema + profile API ✅

- Migration `0013_profiles.sql`: `public_handle` (unique, nullable) + `profile_public` (default 0). Applied locally.
- `POST /api/account/profile` — session-auth, normalize handle, slug regex, blocklist, unique-index → typed errors (`401`/`422 handle_invalid`/`422 <block-msg>`/`409 handle_taken`/`204`).
- `GET /api/account` extended to return `publicHandle` + `profilePublic`.
- `AccountInfo` extended; `setProfile(handle, isPublic)` added to `src/lib/api.ts`; degrades to `{ ok: false, error: 'offline' }`.
- Handle validation inlined in the endpoint (no separate helper file needed — the logic is 4 lines).
- Gate green.

**Left open for P2:** profile page `/jugador/[handle].astro`.

## P2 — Profile page ✅

- `src/pages/jugador/[handle].astro` — SSR, `prerender = false`. Slug-validates the handle first (malformed → same 404). Looks up `accounts WHERE public_handle = ? AND profile_public = 1`; missing → `Astro.response.status = 404`, renders inline 404 with `noIndex` (private and unknown handles indistinguishable).
- Diploma aggregation: `cards WHERE account_id = ? AND completed_at IS NOT NULL AND gallery_hidden = 0 ORDER BY completed_at DESC`. Rows filtered through `checkNick` (blocklist) + `rowToEntry` (now exported from `gallery.ts`).
- Renders: handle as h1, count caption, honorific breakdown chips (colors matching the gallery seals), diploma grid → `/v/{id}`. Dry es-ES empty state when no listed diplomas.
- OG + canonical populated; public profiles are indexable. `display_name`/`email` absent from all branches.
- `GalleryRow` and `rowToEntry` exported from `gallery.ts` (previously unexported) — no behavior change in the gallery; export is additive.
- Gate green.

**Left open for P3:** gallery counter + opt-in UI in `index.astro` + `/privacidad` update.

## P3 — Gallery counter + opt-in UI + privacy ✅

- `src/lib/certificate-design.ts` — `HONORIFIC_COLORS` exported (derived from PALETTE; single source of truth).
- `src/lib/gallery.ts` — `GalleryEntry` extended with `profileHandle`/`siblingCount`; `GalleryRow` gets optional `profile_handle?`/`sibling_count?` (profile page's unjoined query stays valid); `queryGallery` LEFT JOINs `accounts`, CASE-guarded correlated subquery for sibling count.
- `src/pages/galeria.astro` — card restructured to `<div>` + inner `<a>` + profile-link footer (no nested `<a>`). Counter text logic: `>1` → "N bingos del mismo jugador", `=1` → `@handle`. Client `entryHtml` template updated to match. `HONORIFIC_COLORS` now imported from lib.
- `src/pages/jugador/[handle].astro` — `HONORIFIC_COLORS` import switched to lib; local definition removed.
- `src/pages/index.astro` — profile control added to logged-in account bar: three JS-toggled sub-states (none / active / form), `aria-live` error, `sr-only` label, focus management, Enter key, typed-error mapping. `setProfile` added to API import.
- `src/pages/privacidad.astro` — "Perfil público de jugador" section added between accounts and gallery sections. Updated date.
- Gate green.

**Left open for P4:** hardening + companion review pass.

## P2 — Profile page ⏳

_not started_

## P3 — Gallery counter + opt-in UI + privacy ⏳

_not started_

## P4 — Hardening + review ⏳

_not started_

## P5 — PR ⏳

_not started_
