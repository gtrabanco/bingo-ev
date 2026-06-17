# 10 — multi-card-conflict

## Goal

When a logged-in user tries to link a second active (non-completed) card to their
account, detect the conflict and show a dialog that lets them choose which card to
keep. Warn clearly if either card is in a group, and escalate the warning if the
card being discarded is that group's owner. The loser is deleted; the winner becomes
the single active card on the account.

## Branch

`feat/10-multi-card-conflict`

## Size

`S` — 2 commits: one backend (modified endpoint + new endpoint), one UI (modal).
This SPEC is the only planning artifact.

## Dependencies

**Hard:** `05-accounts` merged — the feature only exists once accounts exist.

## Context

Feature 05 introduced `cards.account_id` (nullable) and a `link-card` endpoint that
stamps the logged-in account on a localStorage card. It does not prevent an account
from accumulating multiple active cards — it was intentionally left additive while
the conflict UX was not yet designed.

The scenario: a player starts a card on their mobile (Card A), starts a different
card on their Tesla (Card B), then logs in with Google on the mobile. Card A is
auto-linked to their Google account. Later they generate a device-code on the Tesla,
claim it on the mobile, and the auto-link flow tries to link Card B to the same
account — now both A and B are associated with the same account_id. This is silent
today. Consequences:

1. **Groups**: if both cards are in the same group the player appears twice in
   standings.
2. **Ownership**: if both cards own different groups, `settleDeparture` runs
   independently on each — no corruption, but confusing when either card is deleted.
3. **UX**: "mis diplomas" (future 09) and "achievements" (06) would count the same
   person twice.

The right constraint: **one active card per account at any time**. Completed cards
(diplomas) are exempt — collecting multiple diplomas is a feature, not a bug.

## Business goals

- Protect the integrity of group standings (no account-level duplicates).
- Give the player agency over which card survives — losing the one with more marks
  feels worse than losing the one with less; only they know which card they care about.
- Avoid silent data loss: the discard must be a deliberate, confirmed action.

## Technical goals

- `link-card` returns a structured 409 when a conflict exists, so the client can
  present an informed choice without additional roundtrips.
- A new account-auth DELETE endpoint lets the client remove the *existing* account
  card without needing its secret (the client only has the secret of the *incoming*
  card from localStorage).
- `settleDeparture` is called for any deleted card that was in a group — the
  existing invariant holds with no special casing.

## Scope

### In scope

- Modified `POST /api/account/link-card`: when account already has an active card
  different from the incoming one, return `409` with a `conflict` object containing
  both cards' marks and group context.
- New `DELETE /api/account/card/:cardId` (session-auth only, no secret): removes
  one of the logged-in account's active cards; runs `settleDeparture` if needed.
- Conflict resolution dialog in `index.astro`: shows both cards' progress (marked
  count) + group badge + owner warning; two action buttons; a confirmation step
  when the card being discarded is a group owner.
- After resolution, the winning card's localStorage state is preserved; the loser
  is deleted and removed from any group.

### Out of scope / non-goals

- **Keeping two active cards simultaneously** — explicitly rejected (see Decisions).
  One active card per account, period.
- **Merging marks from both cards** — too complex, low value.
- **Conflict between two completed cards** — completed cards don't conflict; both
  survive as diplomas.
- **Conflict between an active and a completed card** — no conflict: the active card
  is linked normally; the completed card stays as a diploma.
- **"Mis diplomas" dashboard** — owned by feature 09.

## Architecture impact

Touches `src/pages/api/account/` (two endpoints) and `src/pages/index.astro`
(modal). No schema migration — all data needed (marks, group membership, ownership)
already exists. Follows the established patterns:

- Session auth via `getSession(request, db)` from `src/lib/auth`.
- Group departure via `settleDeparture` from `src/lib/groups.ts`.
- `import { env } from 'cloudflare:workers'` — no `locals.runtime.env`.
- `export const prerender = false` on both endpoints.
- Input sanitization not needed (cardId is an internal reference, validated by the
  ownership check; no user-supplied text).

## Design

### Conflict shape returned by `link-card` (409)

```jsonc
{
  "conflict": {
    "existing": {
      "cardId": "abc12345",
      "marks": "010020100001",   // raw 12-char pack; client counts non-zero
      "groupId": "xyz78901",     // null if no group
      "groupName": "Oficina Madrid",  // null if no group
      "isGroupOwner": true       // true if groups.owner_card_id = this card
    },
    "incoming": {
      "cardId": "def45678",
      "marks": "000000000000",
      "groupId": null,
      "groupName": null,
      "isGroupOwner": false
    }
  }
}
```

Both cards are returned so the client has everything to render the dialog in one
shot. The `marks` string is the DB value; the client re-uses its existing
`unpackMarks` + count logic.

SQL for building the conflict object (single query, two LEFT JOINs on groups):

```sql
SELECT
  c.id,
  c.marks,
  c.group_id,
  g.name AS group_name,
  CASE WHEN g.owner_card_id = c.id THEN 1 ELSE 0 END AS is_owner
FROM cards c
LEFT JOIN groups g ON g.id = c.group_id
WHERE c.id IN (?, ?)   -- existing, incoming
  AND c.account_id = ? -- ownership check for existing; incoming verified by secret
```

### `DELETE /api/account/card/:cardId`

- Session-auth required.
- Validates `cards.account_id = session.accountId AND completed_at IS NULL` —
  only active cards on this account, never completed cards (diplomas stay).
- Runs `settleDeparture` if `group_id IS NOT NULL`.
- Deletes the card.
- Returns 204; 403 if card not owned by account; 404 if not found; 409 if card
  is completed (should not happen in normal flow but guard it).

### Client resolution logic

1. `link-card` returns 409 → client stores the conflict payload.
2. Dialog renders: two "card slots" side by side showing marks count, group badge,
   and owner chip.
3. User taps "Conservar este cartón" (incoming, the one in localStorage) →
   calls `DELETE /api/account/card/{existing.cardId}` → on 204, the incoming card
   proceeds to link normally (retry `link-card`).
4. User taps "Conservar el cartón anterior" (existing, the one on the account) →
   calls `discardCard(incoming.cardId, incomingSecret)` (existing endpoint) → on
   success, the account already has the existing card; no re-link needed.
5. After resolution, reload the page so `initAccountBar` reflects the final state.
6. If either path fails (network, 4xx), show an inline error — the conflict dialog
   remains open so the user can retry.

### Group-owner confirmation step

If the card being discarded has `isGroupOwner: true`, show a second screen before
the DELETE fires:

> "Este cartón es el administrador de «Oficina Madrid». Al eliminarlo, la
> administración pasará automáticamente al miembro más veterano. Tendrás que pedir
> que te inviten de nuevo con un cartón nuevo si quieres volver al grupo."

Two buttons: "Entendido, eliminar" / "Cancelar". Cancel returns to the main dialog.

The copy stays within the existing dry-sarcastic tone and never names the group
owner's identity (groups don't have owner names, only owner card ids).

## Decisions to confirm

### D1 — One active card per account (no keep-both exception)

**Chosen:** one active card only, even when one card is in a group and the other
is not.

**Rationale:** allowing a "group card + solo card" exception would make the account
model context-dependent and leak group-awareness into every future feature (06
achievements, 09 profiles). The group conflict in standings is not hypothetical —
same account appearing twice is unfair to other players. The player picks one;
if they want to be in a group they keep the group card and abandon the solo one
(or vice versa). No special case.

### D2 — Server returns both cards' data in the 409, not just the existing

**Chosen:** yes, both cards returned.

**Rationale:** the client already knows the incoming card's marks (from localStorage)
but does not know its group name (only the group id) or group ownership status —
those require a DB join. Returning both eliminates a second roundtrip and keeps the
dialog rendering synchronous after the 409.

### D3 — No auto-resolution based on marks count

**Chosen:** always ask, never decide silently.

**Rationale:** the player may prefer the card in a group (social commitment) over the
one with more marks (personal progress), or the opposite. That trade-off is
theirs to make. Auto-picking the card with more progress would silently destroy group
membership; auto-picking the group card would silently destroy progress. Neither is
acceptable.

## Acceptance criteria

- `POST /api/account/link-card` with session, when account has existing active card,
  returns 409 with `conflict.existing` and `conflict.incoming` populated.
- `POST /api/account/link-card` with no pre-existing active card → still returns
  204 as before (no regression).
- `DELETE /api/account/card/:id` with valid session and owned active card → returns
  204; card is absent from DB; group departure is settled if card was in a group.
- `DELETE /api/account/card/:id` with valid session but completed card → returns 409.
- `DELETE /api/account/card/:id` with session for a different account → returns 403.
- Conflict dialog appears after `initAccountBar` receives a 409 from `link-card`.
- Dialog shows marks count for both cards (e.g. "4/6 situaciones marcadas").
- Dialog shows group badge on any card that is in a group.
- Dialog shows owner warning chip if `isGroupOwner: true`.
- Tapping "Conservar este cartón" → existing card deleted → incoming linked → page
  reloads with the incoming card active.
- Tapping "Conservar el cartón anterior" → incoming card deleted → page reloads
  with the existing card active.
- If either card is a group owner, a second confirmation screen appears before the
  DELETE fires; Cancel returns to the main dialog without deleting anything.
- All paths degrade gracefully when the Worker is unreachable (dialog stays open,
  retry possible).

## Testing requirements

No test suite. Gate: `npm run build` green. Manual scenarios below are the
verification list.

## Dev scenarios

| Scenario | How to reach |
|---|---|
| `conflict:no-group` | Log in on mobile (Card A linked). Generate device-code on Tesla (Card B). Claim on mobile. Conflict dialog appears; no group badges visible. |
| `conflict:existing-in-group` | Card A joined a group. Same as above. Dialog shows group badge on "cartón anterior". |
| `conflict:existing-is-owner` | Card A created a group (is owner). Same as above. Dialog shows owner chip + triggers confirmation step if discarding existing. |
| `conflict:incoming-in-group` | Card B (Tesla) joined a group. Claim on mobile. Dialog shows group badge on "este cartón". |
| `conflict:incoming-is-owner` | Card B (Tesla) owns a group. Claim on mobile. Confirmation step if discarding incoming. |
| `conflict:both-groups` | Both cards in different groups. Both group badges visible. |
| `conflict:keep-existing` | Tap "Conservar el cartón anterior". Incoming deleted, page reloads showing existing card. |
| `conflict:keep-incoming` | Tap "Conservar este cartón". Existing deleted; group departure settled if applicable; page reloads. |
| `conflict:degraded` | Worker down when user taps action button. Error message shown; dialog stays open. |
| `conflict:cancel-confirmation` | Tap action that triggers owner warning; tap Cancel. Returns to main dialog; nothing deleted. |

## Phases

**P1 — Backend**
- Modify `POST /api/account/link-card`: add conflict detection + 409 response.
- New `DELETE /api/account/card/:cardId`: account-auth delete with settleDeparture.
- Gate green; commit.

**P2 — UI**
- Conflict dialog in `index.astro` (HTML + client script).
- Owner-confirmation second screen.
- Wires both resolution paths to the correct API calls.
- Gate green; commit.

**P3 — PR**
- `feat/10-multi-card-conflict` → `main`; `Closes #<issue>`.

## Deploy & rollback

No schema migration. Rollback = revert PR.

## Open questions / risks

- **Race between two devices resolving simultaneously:** both devices could submit a
  resolution at the same moment. The `DELETE /api/account/card/:id` validates
  `account_id = session.accountId AND completed_at IS NULL` — if the card is already
  gone, it returns 404, which the client treats as success (idempotent). Low risk.
- **Link-card called from auto-link loop with multiple localStorage cards:** the
  current `initAccountBar` only has one localStorage card (the active one). If this
  changes in the future, the conflict dialog must be able to handle multiple pending
  links sequentially.

## Deliverables

- `src/pages/api/account/link-card.ts` — conflict detection
- `src/pages/api/account/card/[id].ts` — new DELETE endpoint
- `src/pages/index.astro` — conflict dialog + owner confirmation modal
- `src/lib/api.ts` — client helper for `DELETE /api/account/card/:id`
- `docs/features/10-multi-card-conflict/SPEC.md` (this file)

## Post-merge next feature

`06-achievements-badges` (or `07-situations-total-count` as a quick win first).
