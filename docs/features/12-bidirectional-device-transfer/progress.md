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

## P4 — Hardening + copy + docs (done)

Confirmation pass — no code changes required.

- **Copy**: all new strings confirmed against COPYWRITING.md. Tone dry-sarcastic,
  informal tú, sentence-case, no brand names, no brands in error messages.
- **a11y**: `aria-live` correct on all dynamic status/code/error elements; countdown
  (`#receive-expiry`) deliberately has no `aria-live` (per P2 review fix — would flood
  SRs at 1 s cadence); QR containers `aria-hidden="true"`; all buttons have text-content
  labels; disabled state re-enabled on every failure path.
- **ARCHITECTURE.md**: no edit — `receive_slots` introduces no new invariant. It follows
  the same atomic single-use SQL pattern as `device_codes`, no FK constraint, no
  `settleDeparture` path (transfer never removes from a group).
- **privacidad.astro**: no edit — `result_card_id` is the public card id already
  disclosed in the privacy model; slots TTL ≤5 min; no new personal-data category and
  no new data processor.
- **`transfer:degraded`**: degrade path verified by code review — all three `api.ts`
  helpers degrade to `null`/`false`/`'pending'`; the UI re-enables buttons and shows
  error copy on failure.

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
