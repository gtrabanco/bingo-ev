# 13 — account-delete-full

> Feature specification. SPEC-only (Size `S`) — implement in a single pass with
> `execute-phase 13`.

## Goal

Give a logged-in player a single, honest **"Borrar todo"** action that fully erases
their account and **everything attached to it** — active cartones *and* completed
diplomas, group memberships, sessions, and the account row itself. Today the only
account-deletion endpoint (`DELETE /api/account`) merely *unlinks* cards
(`account_id = NULL`) and is not even wired to any UI, while `/privacidad` already
promises an "Eliminar cuenta" option. This feature delivers a real, exposed,
GDPR-erasure-grade deletion and aligns the privacy copy with what the code does.

## Branch

`feat/13-account-delete-full`

## Size

`S` — one endpoint repurposed, one client helper, one confirmation dialog in the
account bar, plus legal/privacy copy. No schema change, no new dependency. This
SPEC is the only planning artifact.

## Dependencies

**Hard:** `05-accounts` (merged) — the account/session model and `DELETE
/api/account` endpoint this feature repurposes. **Soft:** none. Reuses
`settleDeparture`/`orphanedOwnerRepair` from `lib/groups.ts` (already present).

## Context

- The account-deletion endpoint `DELETE /api/account`
  (`src/pages/api/account/index.ts:41`) runs three statements: `UPDATE cards SET
  account_id = NULL`, delete sessions, delete account. Cards (including diplomas)
  **survive, unlinked**.
- The client helper `deleteAccount()` (`src/lib/api.ts:450`) is **imported but
  never called** in `index.astro` — there is no UI to delete an account at all.
- `/privacidad` (lines 152-154) states the user can delete the account "desde los
  ajustes (opción «Eliminar cuenta»)" and that "los diplomas en sí no se eliminan
  y siguen verificables" — a promise of an option that does not exist, with copy
  that this feature will make untrue.
- **Owner decision (this SPEC):** "Borrar todo" must be a *total* erasure including
  completed diplomas (full RGPD art. 17 supresión), and it is the **only** deletion
  option exposed — the unlink-only path is not surfaced.

## Business goals

- Honour the right to erasure credibly: a one-click, total delete builds trust and
  matches the privacy policy's promise.
- Remove the dishonest gap between the privacy page ("opción «Eliminar cuenta»")
  and the absent UI.

## Technical goals

- One repurposed endpoint that performs a **complete, atomic-as-possible** cascade:
  every card of the account (active + completed) deleted, each group departure
  settled, sessions and account removed.
- Preserve the **group lifecycle invariant**: every card removal runs
  `settleDeparture`; `orphanedOwnerRepair` as a backstop. No read-then-write races.
- No new schema, no new runtime dependency, flat architecture untouched.

## Scope

### In scope

- **Repurpose `DELETE /api/account`** (`src/pages/api/account/index.ts`) to hard-delete:
  1. `SELECT id, group_id FROM cards WHERE account_id = ?` — collect all cards
     (active **and** completed) and their group ids.
  2. `DELETE FROM cards WHERE account_id = ?` — remove every card in one statement.
  3. For each collected row with a non-null `group_id`, run
     `settleDeparture(group_id, cardId)` — **after** the deletes, so "most veteran
     remaining member" excludes the just-deleted cards.
  4. `DELETE FROM sessions WHERE account_id = ?`, then `DELETE FROM accounts WHERE id = ?`.
  5. `orphanedOwnerRepair()` as a backstop for any ownership left dangling.
- **Client helper** `deleteAccount()` stays the same signature (`DELETE
  /api/account` → boolean); only its comment/contract changes (now "deletes
  everything"). Clear local card + session state on success and reload.
- **UI:** a "Borrar todo" control in the logged-in account bar
  (`#account-loggedin`) that opens a **native `<dialog>` confirmation** warning the
  action is total and irreversible (deletes diplomas too). Confirm → call
  `deleteAccount()` → clear `localStorage` card keys → reload.
- **Copy** (es-ES, dry-sarcastic, no brands): button label + confirmation dialog
  body/buttons. Make the irreversibility and the diploma loss explicit.
- **Legal/privacy update:** rewrite `/privacidad` lines 152-154 (deletion now total,
  diplomas **are** removed and stop being verifiable) and `docs/legal/README.md`
  line 42 / line 22 retention note (account erasure deletes linked diplomas).

### Out of scope / non-goals

- **Deleting cards that are not linked to the account** (a local-only card with no
  `account_id`) — those are removed by their own card-delete/expiry paths, not here.
- **An "unlink only / keep diplomas" option** — deliberately not exposed (owner
  decision). The old unlink behaviour is dropped, not kept as a second button.
- **Undo / soft-delete / grace period** — erasure is immediate and final.
- **Server-side export of the user's data before deletion** (data portability) — a
  separate concern, not this feature.
- **Any change to group/card endpoints other than reusing `settleDeparture`.**

## Architecture impact

Touches `src/pages/api/account/index.ts` (the `DELETE` handler), `src/lib/api.ts`
(helper comment), `src/pages/index.astro` (account-bar control + confirmation
dialog + wiring), `src/pages/privacidad.astro`, and `docs/legal/README.md`.

Invariants that must hold (`docs/architecture/ARCHITECTURE.md`):

- **Group lifecycle:** every card deletion settles the departure
  (`settleDeparture`); the GC backstop `orphanedOwnerRepair` runs. Races guarded
  *inside* the SQL — no pre-read gating the writes.
- **Completed-card immunity is intentionally overridden here, and only here.** The
  immunity rule protects diplomas from *GC/expiry sweeps and ordinary card
  deletes*, not from the owner's explicit erasure request. This is the single
  sanctioned path that deletes a completed card; document it as such.
- Server env via `import { env } from 'cloudflare:workers'`; route keeps
  `export const prerender = false`. No new deps. Input is the session only (no
  user strings to sanitize beyond the existing session lookup).

## Design

### Endpoint cascade (`DELETE /api/account`)

```ts
const session = await getSession(request, env.DB);
if (!session) return new Response(null, { status: 401 });
const { accountId } = session;

// 1. Collect every card of this account (active AND completed) + its group.
const { results: cards } = await env.DB
  .prepare('SELECT id, group_id FROM cards WHERE account_id = ?')
  .bind(accountId)
  .all<{ id: string; group_id: string | null }>();

// 2. Delete account-owned data. Cards first so settleDeparture sees final state.
await env.DB.batch([
  env.DB.prepare('DELETE FROM cards WHERE account_id = ?').bind(accountId),
  env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
  env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId),
]);

// 3. Settle every group the deleted cards belonged to (post-delete state).
for (const c of cards) {
  if (c.group_id) await settleDeparture(c.group_id, c.id);
}
await orphanedOwnerRepair().run();

return new Response(null, { status: 204 });
```

Notes:
- The card/session/account deletes go in one `batch()` (D1 transactional batch).
  `settleDeparture` runs after — it re-reads *current* state, which by then
  excludes the deleted cards, so the most-veteran-remaining computation is correct.
- A card with `group_id` set but where the row is the group owner/winner is handled
  by `settleDeparture`'s existing SQL (vacate trophy, hand ownership to oldest
  remaining, dissolve if empty). `orphanedOwnerRepair()` covers any residue.
- Deleting a completed card removes it from the gallery (gallery rows are derived
  from `cards` by `gallery.ts`) and makes `/v/{id}` stop resolving — the intended
  total-erasure effect.

### Client (`index.astro` + `api.ts`)

- `deleteAccount()` keeps `DELETE /api/account` → `boolean`; update its comment to
  "Deletes the account, all its cards (including diplomas), sessions."
- New account-bar control `#btn-delete-account` ("Borrar todo") in
  `#account-loggedin`. On click → open `#delete-account-dialog` (native `<dialog>`).
- Confirmation dialog: explicit warning (irreversible; diplomas deleted and no
  longer verifiable). Two buttons: cancel (default focus) and a destructive
  confirm. Confirm → `await deleteAccount()`; on success clear local card keys
  (`CURRENT_CARD_KEY` + `evbingo.card.*` for the active card) and `reload()`.
- Degraded: if `deleteAccount()` returns `false` (Worker down / timeout), show an
  inline error in the dialog ("No se pudo borrar. Inténtalo de nuevo.") and keep
  the dialog open — never wipe local state on a failed server call.

### Copy (es-ES, dry-sarcastic, no brands)

- Button: **"Borrar mi cuenta y todo"** (or "Borrar todo" if space-constrained in
  the navbar bar).
- Dialog title: **"¿Borrar todo, de verdad?"**
- Dialog body: e.g. *"Esto borra tu cuenta, tus cartones y también tus diplomas.
  No quedará nada que verificar ni que presumir. No hay vuelta atrás."*
- Confirm button: **"Sí, bórralo todo"**. Cancel: **"Mejor no"**.
- Final wording lands in implementation; honour `docs/frontend/COPYWRITING.md`.

## Decisions to confirm

- **D1 — Delete completed diplomas too?** **RESOLVED: yes.** Total erasure (RGPD
  art. 17). Overrides completed-card immunity for this explicit-request path only.
  `/v/{id}` and gallery entries for those cards disappear. *(Owner decision.)*
- **D2 — Expose unlink-only as a second option?** **RESOLVED: no.** Only "Borrar
  todo" is surfaced; the previous unlink behaviour is replaced, not kept. *(Owner
  decision.)*
- **D3 — Endpoint: new route vs repurpose `DELETE /api/account`?** **RESOLVED:
  repurpose.** The old unlink endpoint has no UI caller, so changing its behaviour
  breaks nothing; a second route would be dead weight against flat architecture.

## Acceptance criteria

- Logged in, the account bar shows a "Borrar todo" control; logged out it is absent.
- Clicking it opens a native `<dialog>` confirmation (Esc/cancel closes it without
  deleting; focus starts on the non-destructive option).
- Confirming deletes: the account row, all its sessions, **all** its cards
  including completed diplomas, and settles every group the cards were in (no
  orphaned owners, emptied rooms dissolved, vacated trophies reopened).
- After a completed card is deleted this way, its `/v/{id}` no longer resolves and
  it no longer appears in `/hall-of-fame`.
- On success the client clears the local active-card keys and reloads to a
  logged-out, card-less state.
- If the Worker is unreachable, no local state is wiped and the dialog shows a
  retryable error.
- `/privacidad` and `docs/legal/README.md` describe deletion as total (diplomas
  included, no longer verifiable); no copy claims diplomas survive deletion.
- `npm run build` passes.

## Testing requirements

No test suite — gate is `npm run build` green. Manual verification via `npm run
dev` + the preview MCP across the dev scenarios below. Verify the group-settlement
cases against the D1 (local) state, since they are the highest-risk path.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `delete:happy` | account + active card + diploma all gone | log in, have one active card, confirm "Borrar todo" |
| `delete:owner-in-group` | deleting an account whose card owns a group hands ownership to the oldest remaining member (or dissolves) | join/own a group on the account's card, then delete |
| `delete:winner-in-group` | deleting an account whose card holds the trophy reopens the room | win in a group, then delete |
| `delete:diploma-erased` | `/v/{id}` 404s and the gallery entry disappears | complete a card (diploma), delete account, hit its `/v/{id}` |
| `delete:degraded` | Worker down → dialog shows retryable error, local state intact | stop the Worker, confirm deletion |
| `delete:logged-out` | control absent when not logged in | open the game without a session |

## Phases

Single-pass (S): one commit on `feat/13-account-delete-full`.

- **P0 — planning:** this SPEC (done).
- **P1 — implement:** repurpose `DELETE /api/account` cascade; add the account-bar
  control + confirmation dialog + wiring; update `deleteAccount()` comment; rewrite
  `/privacidad` + `docs/legal/README.md` deletion copy; verify dev scenarios; gate;
  commit.
- **PR:** open against `main`.

## Deploy & rollback

n/a migration-wise — no schema change. Rollback = revert the PR. **Caveat:** any
account/diploma deleted via the new path before a rollback is **permanently gone**
(no soft-delete); rollback restores the *code*, not erased data.

## Open questions / risks

- **Risk: settleDeparture loop after a batch delete.** Mitigated by deleting cards
  first, then settling against current state (matches the existing
  complete/card-delete ordering). Verify the `delete:owner-in-group` scenario.
- **Risk: partial failure** (batch succeeds, a later `settleDeparture` throws). The
  account/cards are gone but a group could be left with a stale owner pointer;
  `orphanedOwnerRepair()` and the opportunistic GC batches on card-issue/group-create
  heal it. Acceptable for a parody app; noted.
- **Inherited (RESOLVED): completed-card immunity** — explicitly overridden for this
  one user-initiated erasure path (D1).

## Deliverables

- `src/pages/api/account/index.ts` — `DELETE` handler repurposed to full cascade.
- `src/lib/api.ts` — `deleteAccount()` contract/comment updated.
- `src/pages/index.astro` — "Borrar todo" control + confirmation `<dialog>` + wiring.
- `src/pages/privacidad.astro` — deletion copy rewritten (total erasure).
- `docs/legal/README.md` — retention/erasure note updated.
- `docs/features/13-account-delete-full/SPEC.md` (this file).
- Roadmap entry 13 reflects the decided scope.

## Post-merge next feature

Per `docs/features/ROADMAP.md` — `06-achievements-badges` or `07-situations-total-count`
(both `planned`); no hard sequencing dependency on this feature.
