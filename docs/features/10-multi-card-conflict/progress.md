# 10 — multi-card-conflict · Progress

## P1 — Backend (done)

- Modified `src/pages/api/account/link-card.ts`: conflict detection via two-query approach (secret verify + active-card check). Returns 409 with `{ conflict: { existing, incoming } }` when account already has a different active card. Completed cards are exempt.
- New `src/pages/api/account/card/[id].ts`: `DELETE` endpoint — session-auth only, validates ownership + active state, runs `settleDeparture` if card was in a group, returns 204/403/404/409.
- Updated `src/lib/api.ts`: `linkCard` return type changed `boolean` → `LinkCardResult` (exposes conflict payload); new `deleteAccountCard` helper.
- Gate green.

## P2 — UI (pending)

Conflict dialog in `index.astro` (HTML + client script). Owner-confirmation second screen. Wire both resolution paths.
