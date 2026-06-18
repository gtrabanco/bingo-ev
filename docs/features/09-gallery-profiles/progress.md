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

## P2 — Profile page ⏳

_not started_

## P3 — Gallery counter + opt-in UI + privacy ⏳

_not started_

## P4 — Hardening + review ⏳

_not started_

## P5 — PR ⏳

_not started_
