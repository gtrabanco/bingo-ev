# 10 — multi-card-conflict · Progress

## P1 — Backend (done)

- Modified `src/pages/api/account/link-card.ts`: conflict detection via two-query approach (secret verify + active-card check). Returns 409 with `{ conflict: { existing, incoming } }` when account already has a different active card. Completed cards are exempt.
- New `src/pages/api/account/card/[id].ts`: `DELETE` endpoint — session-auth only, validates ownership + active state, runs `settleDeparture` if card was in a group, returns 204/403/404/409.
- Updated `src/lib/api.ts`: `linkCard` return type changed `boolean` → `LinkCardResult` (exposes conflict payload); new `deleteAccountCard` helper.
- Gate green.

## P2 — UI (done)

- `src/pages/index.astro`: new `<dialog id="conflict-dialog">` with two sub-screens (main choice + owner confirmation). Client script: `ConflictCardInfo`/`ConflictPayload`/`ConflictState` types; `showConflictDialog`, `showOwnerConfirmation`, `resolveKeepIncoming`, `resolveKeepExisting` functions; element refs + event wiring for all four buttons.
- `initAccountBar` updated: `linkCard` call now awaited; on `{ ok: false, conflict }` result → `showConflictDialog` is called and the function returns early (account-bar setup is paused until resolution).
- Resolution paths: "Conservar este" → `deleteAccountCard(existing)` → re-`linkCard(incoming)` → reload. "Conservar el anterior" → `fetch DELETE /api/cards/:id` (with secret) → reload. Both paths degrade: errors shown inline, dialog stays open for retry.
- Owner confirmation: shown before DELETE fires if `isGroupOwner: true` on the card being discarded. Cancel returns to main screen.
- Gate green.
