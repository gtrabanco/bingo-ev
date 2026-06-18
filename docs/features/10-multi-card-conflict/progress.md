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

## Hardening (review fixes + tradeoff record)

**Fix-now fixes applied (review findings 1–3):**
- `link-card.ts`: restored control-char sanitization regex `/[\x00-\x1f\x7f]/g` (my `Write` had silently replaced it with `/[ -]/g`, a hard-convention regression).
- `account/card/[id].ts`: switched DELETE to `RETURNING group_id` pattern (aligns with project convention at `cards/[id]/index.ts:96`; prevents settling after a no-op delete in the concurrent-completion race).
- `index.astro` / `api.ts`: moved inline `fetch` in `resolveKeepExisting` out to a named `deleteCard(cardId, secret)` helper in `api.ts` — api.ts is the declared client→server boundary.

**Postponed (issue):**
- [#18](https://github.com/gtrabanco/bingo-ev/issues/18) — a11y: `aria-labelledby` on the conflict dialog points to screen-1's heading while screen-2 is visible.

**Intentional tradeoff:**
- Native `<dialog>` Escape key dismisses the conflict dialog without resolving it. Enforcing no-escape would make the modal harder to dismiss than the risk warrants; the conflict reappears on next reload.
