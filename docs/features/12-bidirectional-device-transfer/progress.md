# 12 — bidirectional-device-transfer · Progress

## P1 — Schema + endpoints (done)

Shipped: `migrations/0014_receive_slots.sql` (additive, 0013 was already taken by
profiles); `POST /api/receive-slot` (create); `POST /api/receive-slot/:code/deposit`
(scanner proves ownership, atomic write-once); `GET /api/receive-slot/:code` (poll
with pending-vs-gone follow-up SELECT); three client helpers in `src/lib/api.ts`.

All manual endpoint scenarios passed. Build green. Migration note captured in TASKS.

## P2 — `/activar` bidirectional UI (done)

Rewrote `src/pages/activar.astro` to support three modes: push auto-claim (unchanged
zero-JS path), deposit mode (`?recv=CODE` — card-holder deposits via `depositToReceiveSlot`
with alias in button label, or "no card" message if device is empty), and receive
affordance (generator creates a slot, renders code + QR + countdown, polls every 3 s
via `pollReceiveSlot`, navigates to `/?card=&k=` on result). Also fixed `createReceiveSlot`
in `api.ts` to send `content-type: application/json` (required to pass Astro's CSRF
guard for bodiless POST).

Verified: receive panel shows code + QR + countdown; no-card scanner branch shows correct
message; push auto-claim redirects to `/` as before (regression clean).

**Left open for P3:** collision guard in `recoverFromUrl()` — when an incoming card differs
from a non-trivial existing local card, show the conflict dialog instead of silently overwriting.

## P3 — Collision guard (done)

Extended `recoverFromUrl()` (`src/pages/index.astro`) with three-way classification:
- **equal** (same card id) → idempotent update (unchanged).
- **trivial** (0 marks, no group, not completed, or no secret) → silent adopt (unchanged).
- **non-trivial** → fetch group standings for both cards in parallel (best-effort), then show
  the generalized conflict dialog.

Generalized feature-10's conflict dialog to a `mode: 'account' | 'local'` split:
- `showConflictDialog` gained optional `mode`, `existingSecret`, `incomingCardState` params
  (defaulted → backward-compat with the existing `initAccountBar` call site).
- `resolveKeepIncoming` (local): `deleteCard(existingId, existingSecret)` → `saveCard(incoming)` → reload.
- `resolveKeepExisting` (local): close dialog — no deletion; existing card stays active.
- Intro copy branches on `mode` (avoids "Tu cuenta" in no-account path).
- Group-owner confirmation step and departure settlement flow unchanged (routes through
  `settleDeparture` server-side on `DELETE /api/cards/:id`).
- `fetchGroupStandings` added to imports in `index.astro`.

Decision recorded in `decisions.md` D2: used `deleteCard` (awaitable) rather than
`discardCard` (fire-and-forget) so the dialog can surface deletion failures to the player.
