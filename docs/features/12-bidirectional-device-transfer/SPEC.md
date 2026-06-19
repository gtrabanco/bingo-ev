# 12 — bidirectional-device-transfer

## Goal

Make the cross-device card transfer work in **both directions**, not just from a
card-holding device to an empty one. Today the only flow is *push*: the device that
holds the card generates a code/QR on the game page, and the empty device opens
`/activar` and adopts it. This cannot serve the canonical case where the screen that
displays the QR is the one *without* a card — e.g. you sit in a car, open the bingo
on the car's browser (no card, big screen, no camera), and want to pull the card
from the phone in your hand (has the card, has the camera). This feature adds the
*pull* direction: a card-less device generates a **receive slot** at `/activar`,
shows its QR, and **polls** for a result; the card-holding device scans it and
**deposits** its card; the receiving device adopts it. Collisions (both devices
already hold an active card) are resolved with the explicit, no-silent-loss choice
already decided in feature `10-multi-card-conflict`.

## Branch

`feat/12-bidirectional-device-transfer`

## Size

`M` — phased work (schema migration + new endpoints + a reworked `/activar` page +
a client poll loop + a generalized conflict dialog). Full artifact set
(`PLAN.md`, `TASKS.md`) accompanies this SPEC. Resized from the roadmap's original
`S` estimate once the surface area (one migration, three endpoints, two pages,
polling, and the collision path) was scoped — see [Decisions](#decisions-to-confirm).

## Dependencies

**Hard:** none. The push transfer (`device_codes` + `/api/cards/:id/device-code` +
`/api/device-code/claim` + `/activar`) already exists and ships independently.

**Soft:** `10-multi-card-conflict` (merged) — its decided semantics (one active card,
explicit choice, never merge marks, never silently overwrite) are **reused** for the
both-devices-have-a-card collision. This feature generalizes that dialog to the
no-account case (pure card-id + secret, no login required).

## Context

The current transfer is one-directional and lives in two places:

- **Generate (push):** `#device-code-btn` on `src/pages/index.astro` calls
  `POST /api/cards/:id/device-code` (owner-secret proven). The server inserts a
  `device_codes` row `(code, card_id, expires_at)` with a 5-minute TTL and returns
  the code; the client renders a QR encoding `/activar?code=CODE`
  (`renderDeviceCodeQr`, `src/pages/index.astro:1890`).
- **Claim (adopt):** `/activar` (`src/pages/activar.astro`) auto-claims server-side
  when `?code=` is present — `UPDATE device_codes SET consumed_at … RETURNING card_id`,
  then `302 → /?card=ID&k=SECRET`, where the game page's `recoverFromUrl()`
  (`src/pages/index.astro:826`) adopts the card into localStorage. A manual entry
  form + `POST /api/device-code/claim` covers the no-QR path.

The gap: the device that **shows** the QR must be the one that **holds** the card,
because only a card-holder can generate a code and only the QR encodes the transfer.
In the car/Tesla case the ergonomics are reversed — the big screen (no card) shows
the QR and the phone (has card, has camera) scans it. There is no way today for the
QR-screen device to *receive*. The roadmap calls this the inversion: *"if the
claiming device already has an active card, the flow inverts — the source device
loads the claiming device's card instead."*

A second, pre-existing rough edge surfaces here: `recoverFromUrl()` **silently
overwrites** whatever card is in localStorage whenever a `?card=&k=` link is opened
(transfer redirect *or* email recovery link). Once transfer is bidirectional, a
card-holding device can land on an incoming card and lose its own progress without a
prompt. Feature 10 already decided how this must behave (explicit choice); this
feature applies that decision at the transfer/recovery boundary.

## Business goals

- Unlock the headline real-world use case (play on a vehicle screen using the card
  from your phone) that the push-only flow structurally cannot serve.
- Make "this card, on that screen" feel like one obvious gesture in either
  direction — reducing the friction that keeps casual players from carrying their
  card across devices (the on-ramp to the durable-identity features 05/09).
- Never destroy a player's progress without an explicit, reversible choice.

## Technical goals

- Add the *pull* direction **additively**, without altering the existing *push*
  tables, endpoints, or the zero-JS `/activar?code=` redirect path.
- Keep the offline-first, degrade-to-`null` client boundary (`src/lib/api.ts`) and
  the server's atomic single-use / single-write SQL patterns intact.
- Reuse the feature-10 conflict resolution rather than inventing a parallel one;
  generalize it to work without an account.

## Scope

### In scope

- **Migration `0013`** — a new additive table `receive_slots` for the pull
  direction (the existing `device_codes` table is untouched).
- **Receive mode on `/activar`** — when the device has **no usable card**, show a
  "Recibir un cartón aquí" affordance that creates a receive slot, renders its QR
  (encoding `/activar?recv=CODE`) and the short code, and **polls** for the result.
- **`POST /api/receive-slot`** — creates an empty receive slot (no auth;
  `RATE_LIMITER_CREATE`). Returns `{ code, expiresIn }`.
- **`POST /api/receive-slot/:code/deposit` `{ cardId, secret }`** — the scanner
  proves ownership of its card and atomically writes it into a pending slot.
- **`GET /api/receive-slot/:code`** — the generator's poll: pending → `204`;
  deposited → atomically consume and return `{ id, secret }` of the deposited card;
  expired/missing → `410`.
- **Scanner handling on `/activar?recv=CODE`** — a card-holding device offers
  "Enviar tu cartón a la otra pantalla" and deposits; a card-less device sees a
  graceful "no tienes cartón que enviar" message.
- **Collision guard in `recoverFromUrl()`** — when an incoming card (from any
  `?card=&k=`, i.e. push redirect or recovery link) differs from an existing
  **non-trivial** active card (has marks, is registered, or is in a group), show the
  generalized conflict dialog instead of overwriting. A pristine, unstarted card
  (0 marks, no group) is replaced silently.
- **es-ES copy** for all new UI in the established dry-sarcastic tone, no brand names.

### Out of scope / non-goals

- **Changing the push direction** — `device_codes`, `POST /api/cards/:id/device-code`,
  `POST /api/device-code/claim`, and the server-side `/activar?code=` auto-claim
  redirect stay byte-stable. The only push-path change is the *client-side* collision
  guard in `recoverFromUrl()`, which fires only when the scanner already holds a
  non-trivial card.
- **Merging marks from two cards** — explicitly rejected by feature 10. The player
  keeps exactly one of the two cards.
- **An automatic inversion on a normal push QR** — a card-holding device scanning a
  *push* QR does **not** silently flip the transfer so the source adopts its card.
  Instead it gets the conflict dialog (choose which card survives). Deliberate
  card-less→card-holder pull is done through the *receive slot*, not by inverting a
  push.
- **Account login as a precondition** — the pull direction works on the card-id +
  secret model alone, like push. Accounts remain optional.
- **A receive entry point on the game page navbar** — the navbar device-transfer
  button stays push-only (shown only when a card exists). Receive mode lives on
  `/activar`, which is exactly where a card-less device lands. (Revisit only if usage
  shows demand.)
- **Real-time signalling / WebSockets** — polling is sufficient for a 5-minute,
  single-use handshake. No Durable Object, no new runtime dependency.

## Architecture impact

- **Flat architecture preserved** — new files under `src/pages/api/receive-slot/`
  and edits to `src/pages/activar.astro`, `src/pages/index.astro`, `src/lib/api.ts`,
  plus a `migrations/0013_*.sql`. No new layer, no new runtime dependency (QR uses
  the already-approved `uqr`).
- **Hard conventions honored** — `import { env } from 'cloudflare:workers'`;
  `export const prerender = false` on every new endpoint; server-side input
  sanitization (the deposit's `cardId`/`secret` are validated by the ownership query;
  no free-text is stored). Codes use the existing `auth.ts` alphabet/validators.
- **Atomic single-use / single-write SQL** — both the deposit (write-once into a
  pending slot) and the poll (consume-once) re-check state inside the `UPDATE`,
  matching the existing claim's "the UPDATE is the read+mark" pattern. No
  read-then-write races.
- **Offline-first boundary** — all three new client calls in `src/lib/api.ts`
  degrade to `null` on timeout/failure; the poll loop tolerates transient `null`s and
  keeps trying until the slot expires.
- **No `settleDeparture` impact** — transfer copies credentials; it never deletes a
  card or removes it from a group. The collision dialog, when the player discards a
  card, routes through the **existing** deletion paths (`discardCard` for a local
  card, or feature-10's account DELETE when logged in), which already settle
  departures. No new deletion path is introduced.

## Design

### Direction model

A transfer always has a **generator** (shows the QR, then waits) and a **scanner**
(reads the QR, then acts). The card flows to whichever device lacks one. The QR's
URL parameter encodes the direction, so the scanner knows what to do **without** a
server lookup:

| Direction | Generator | QR encodes | Scanner | Mechanism |
|---|---|---|---|---|
| **Push** (existing) | card-holder (game page) | `/activar?code=CODE` | empty device | scanner adopts source's card (`device_codes`, unchanged) |
| **Pull** (new) | card-less device (`/activar`) | `/activar?recv=CODE` | card-holder | scanner deposits its card; generator polls + adopts (`receive_slots`) |

Collisions are decided by what the **scanner** holds when it opens the QR's URL:

| Scanner opens | Scanner holds a card? | Result |
|---|---|---|
| `?code=CODE` (push) | no | adopt source's card — current behaviour, unchanged |
| `?code=CODE` (push) | yes, non-trivial | **conflict dialog** (feature 10) — choose which card survives |
| `?recv=CODE` (pull) | yes | deposit its card into the slot |
| `?recv=CODE` (pull) | no | graceful "no card to send" message |

### Schema — `migrations/0013_receive_slots.sql`

A new table, additive (the push table `device_codes` is left exactly as defined in
`0012`):

```sql
-- Pull-direction transfer: a card-less device opens an empty slot and polls it; a
-- card-holding device deposits its card id into it; the opener then adopts that card.
CREATE TABLE receive_slots (
  code           TEXT PRIMARY KEY,   -- same alphabet/format as device_codes
  result_card_id TEXT,               -- null = pending; set once a scanner deposits
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  consumed_at    TEXT                -- set when the generator's poll claims the result
);
```

`result_card_id` is the only card reference and it is a public card id (the same
identifier already used in every URL), not a secret. No new category of personal
data is stored. TTL mirrors `DEVICE_CODE_TTL_SECONDS` (5 min). Each create batches an
opportunistic GC (`DELETE FROM receive_slots WHERE expires_at < ?`), matching
`device-code.ts`.

### Endpoints (all `prerender = false`, `import { env } from 'cloudflare:workers'`)

**`POST /api/receive-slot`** — create an empty slot.
- Rate limit: `RATE_LIMITER_CREATE` (10/min) keyed by `CF-Connecting-IP`.
- Generate a code via `generateDeviceCode()`; insert `(code, NULL, now, now+TTL)`;
  batch the GC delete. Return `201 { code, expiresIn: DEVICE_CODE_TTL_SECONDS }`.

**`POST /api/receive-slot/:code/deposit` `{ cardId, secret }`** — scanner deposits.
- Rate limit: `RATE_LIMITER_WRITE` (120/min).
- Validate code format (`normalizeDeviceCode` + `isValidDeviceCodeFormat`); sanitize
  `secret` (strip control chars, trim, cap length) and `cardId` (validate
  `^[0-9a-z]{8}$`).
- Prove ownership: `SELECT id FROM cards WHERE id = ? AND secret = ?`; `403` if no
  match.
- Atomic write-once into a pending, unexpired slot:

  ```sql
  UPDATE receive_slots SET result_card_id = ?
  WHERE code = ? AND result_card_id IS NULL AND consumed_at IS NULL AND expires_at > ?
  RETURNING code
  ```

  No row updated → `410` (missing, already filled — first deposit wins — or expired).
  Success → `204`.

**`GET /api/receive-slot/:code`** — generator poll. No per-IP rate limit (read-only,
gated by the high-entropy code; the client polls on a ≥3 s interval, well within any
limit). 
- Validate code format.
- Atomic consume-once:

  ```sql
  UPDATE receive_slots SET consumed_at = ?
  WHERE code = ? AND result_card_id IS NOT NULL AND consumed_at IS NULL AND expires_at > ?
  RETURNING result_card_id
  ```

  - No row + slot still pending/unexpired → `204` (keep polling).
  - No row + expired/gone → `410`.
  - Row → look up `SELECT id, secret FROM cards WHERE id = ?`; if found with a
    secret, return `200 { id, secret }`; else `410`.

  Disambiguating `204`-pending from `410`-gone needs a second cheap `SELECT` of the
  slot when the `UPDATE` matches nothing — see [Open questions](#open-questions--risks).

### `src/lib/api.ts` additions (each degrades to `null`/`false`)

```ts
createReceiveSlot(): Promise<{ code: string; expiresIn: number } | null>
depositToReceiveSlot(code: string, cardId: string, secret: string): Promise<boolean>
pollReceiveSlot(code: string): Promise<{ id: string; secret: string } | 'pending' | 'gone'>
```

`pollReceiveSlot` maps `204 → 'pending'`, `200 → {id,secret}`, `410 → 'gone'`, and
network/timeout → `'pending'` (so a blip doesn't abort the loop before expiry).

### `/activar` rework (`src/pages/activar.astro`)

The server-side `?code=` auto-claim **stays** (the zero-JS push path for an empty
scanner). New client behaviour, decided by `?recv=` / `?code=` and localStorage:

1. **`?recv=CODE`** (scanned a receive QR):
   - Has a usable card → render "Enviar tu cartón a la otra pantalla" with the card's
     alias; on confirm call `depositToReceiveSlot(code, card.id, card.secret)`; on
     success show "Cartón enviado. Ya puedes seguir en la otra pantalla." (the
     scanner keeps its card).
   - No usable card → "No tienes ningún cartón que enviar. Crea uno o pide el código
     en el otro sentido."
2. **No params, no card** → besides the existing manual-entry form, show **"Recibir
   un cartón aquí"**: calls `createReceiveSlot()`, renders the code + a QR encoding
   `/activar?recv=CODE` (reuse the `renderDeviceCodeQr` SVG approach), starts the
   expiry countdown, and **polls** `pollReceiveSlot` every 3 s. On a `{id,secret}`
   result → `location.href = /?card=ID&k=SECRET` (the game page adopts it). On
   `'gone'`/expiry → stop, show "Código caducado". The QR-screen is the generator.
3. **`?code=CODE`** (scanned a push QR) → unchanged for an empty scanner (server
   already redirected). The card-holding-scanner collision is handled where the
   overwrite would land (next section), not here.

### Collision guard in `recoverFromUrl()` (`src/pages/index.astro`)

Before adopting an incoming `?card=&k=` card, compare it to the current localStorage
card:

- No current card, or current card is **trivial** (0 marks, not in a group) → adopt
  silently (today's behaviour; covers a Tesla that minted an empty card by visiting
  `/` first).
- Current card is **non-trivial** and differs from the incoming card → show the
  **generalized conflict dialog** (feature 10's UI) with both cards' progress + group
  context, and let the player choose:
  - *Keep the incoming card* → discard the current local card via the existing
    `discardCard(id, secret)` path (or feature-10's account DELETE when logged in,
    which settles departures), then adopt the incoming card.
  - *Keep my card* → drop the incoming reference; clean the URL; nothing is deleted.
- Incoming card **equals** the current card (same id) → no-op adopt (idempotent).

Feature 10's dialog is account-scoped today; here it is reached without a login, so
its "discard the loser" branch must support the local `discardCard(id, secret)` path
in addition to the account DELETE. The dialog copy, marks-count rendering, and group
/ owner warnings are reused verbatim.

### Copy (es-ES, dry-sarcastic, no brands) — illustrative

- Receive affordance: **"Recibir un cartón aquí"**; helper *"Genera un código,
  escanéalo desde el dispositivo que ya tiene el cartón y se mudará a esta pantalla."*
- Deposit prompt: **"Enviar «{alias}» a la otra pantalla"**.
- Deposit done: *"Enviado. Tu cartón sigue aquí y también allí; ya sois dos
  pantallas sufriendo lo mismo."*
- No card to send: *"Aquí no hay ningún cartón que enviar. Estrena uno o pide el
  código al revés."*

Final wording is fixed during implementation against `docs/frontend/COPYWRITING.md`.

## Decisions to confirm

### D1 — Collision uses feature-10 semantics, not an automatic push inversion — **CONFIRMED**

When both devices hold an active card, reuse the decision already made in
`10-multi-card-conflict`: present the explicit choose-which-card-survives dialog;
never merge marks; never overwrite silently. The roadmap's literal "the source device
loads the claiming device's card" is **superseded** by this — automatic inversion on
a push QR is rejected because it would surprise whoever generated the share QR and
risk silent loss. Deliberate card-less→card-holder transfer is done via the **receive
slot** (the generator explicitly asked to receive). *(Owner decision, this session.)*

### D2 — Pull is a new additive table, not a reshape of `device_codes` — **CONFIRMED (planner)**

`device_codes.card_id` is `NOT NULL` (migration `0012`); making it nullable needs a
SQLite table rebuild and risks the byte-stable push path. A separate `receive_slots`
table is purely additive, isolates the new direction, and keeps the two GC/poll
concerns independent. Cost: a little duplicated GC SQL — acceptable.

### D3 — Direction encoded in the QR URL param (`?recv=` vs `?code=`) — **CONFIRMED (planner)**

The scanner must know whether to adopt or deposit. Encoding direction in the param
avoids a server round-trip and an ambiguous shared code namespace, and keeps each
direction's table lookup unambiguous.

### D4 — Size raised S → M — **CONFIRMED (owner, this session)**

The scoped surface (migration + three endpoints + two reworked pages + a poll loop +
the generalized dialog) exceeds the "≤ one commit / ≤ half a day" S bar; planned as M
with full artifacts.

### D5 — Poll transport is HTTP polling, not WebSockets/Durable Objects — **CONFIRMED (planner)**

A 5-minute, single-use handshake does not justify a Durable Object or a new
dependency. A 3 s client poll over a code-gated read is sufficient and keeps the
no-new-runtime-dependency rule.

## Acceptance criteria

- `POST /api/receive-slot` returns `201 { code, expiresIn }`; the row exists with
  `result_card_id IS NULL`; expired rows are GC'd in the same batch.
- `POST /api/receive-slot/:code/deposit` with a valid `{cardId, secret}` into a
  pending slot returns `204` and sets `result_card_id`; a second deposit into the
  same slot returns `410` (first deposit wins); a wrong secret returns `403`; an
  expired/missing slot returns `410`.
- `GET /api/receive-slot/:code` returns `204` while pending, `200 { id, secret }`
  once deposited (and marks the slot consumed so a second poll returns `410`), and
  `410` when expired/missing.
- On `/activar` with **no card and no params**, "Recibir un cartón aquí" creates a
  slot, shows a scannable QR (`/activar?recv=CODE`) + code + live countdown, and polls.
- A card-holding device opening `/activar?recv=CODE` can deposit its card; on success
  the generator device navigates to its game with the deposited card adopted, while
  the depositing device keeps its own card.
- A card-less device opening `/activar?recv=CODE` sees the graceful "no card to send"
  message and is not broken.
- The existing push path is unchanged: empty device opening `/activar?code=CODE`
  still adopts the source card via the server redirect, with no extra prompt.
- A **non-trivial** card-holding device that lands on an incoming `?card=&k=` (push
  redirect or recovery link) gets the conflict dialog and can choose; a **trivial**
  (0-mark, no-group) card is replaced silently; an identical incoming card is a no-op.
- Choosing to discard a card that is in/owns a group settles the departure via the
  existing deletion path (no orphaned ownership).
- Every new client call degrades to `null`/`'pending'` with the Worker unreachable;
  the poll loop survives transient failures and only stops at a real result or expiry.
- `npm run build` is green.

## Testing requirements

No test suite; the gate is `npm run build` (green) plus the manual dev scenarios
below, exercised with `npm run dev`. After adding migration `0013`, run
`npx wrangler d1 migrations apply ev-bingo --local` before testing so `receive_slots`
exists in dev. Verify in a browser (Claude Preview MCP) across two contexts (e.g. a
normal window as the card-holder and a private window as the empty generator) to
simulate two devices.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `recv:happy` | Tesla pulls phone's card | Empty window → `/activar` → "Recibir aquí" → QR; card window → `/activar?recv=CODE` → deposit → empty window adopts |
| `recv:no-card-scanner` | card-less device scans a receive QR | Open `/activar?recv=CODE` in a window with no card → graceful message |
| `recv:expired` | slot times out before deposit | Generate slot, wait > 5 min (or shorten TTL locally), confirm poll stops on `410` and shows caducado |
| `recv:double-deposit` | two scanners race one slot | Deposit twice with different cards → second gets `410`; generator adopts the first |
| `push:happy` | unchanged push | Card window generates code (navbar) → empty window `/activar?code=CODE` → adopts (regression check) |
| `collision:non-trivial` | both devices hold a real card | Card window with marks generates push code; another card-with-marks window opens `/activar?code=CODE` → conflict dialog |
| `collision:trivial-silent` | empty minted card replaced | Tesla visits `/` (mints empty card), then receives → no dialog, silent replace |
| `collision:group-owner` | discarded card owns a group | Make the to-be-discarded card a group owner → confirmation step → departure settled |
| `transfer:degraded` | Worker down mid-flow | Stop the Worker during create/deposit/poll → calls return `null`/`'pending'`, UI shows retry/caducado, no crash |

## Phases

**P0 — Planning** — this SPEC + `PLAN.md` + `TASKS.md`; roadmap row updated. *(done
when these files exist and `ROADMAP.md` row 12 points here.)*

**P1 — Schema + endpoints** — `migrations/0013_receive_slots.sql`; the three
`src/pages/api/receive-slot/*` endpoints; `src/lib/api.ts` client helpers. Apply the
migration locally. Gate green; commit.

**P2 — `/activar` bidirectional UI** — receive mode (create + QR + countdown + poll)
and the scanner deposit / no-card branches. Gate green; commit.

**P3 — Collision guard** — generalize feature 10's conflict dialog to the no-account
case and wire it into `recoverFromUrl()` (trivial-card silent replace, non-trivial
choice, group-owner confirmation). Gate green; commit.

**P4 — Hardening + copy + docs** — finalize es-ES copy against `COPYWRITING.md`;
confirm `ARCHITECTURE.md` needs no new invariant (or add a one-line note on the pull
slot); verify all dev scenarios. Gate green; commit.

**P5 — PR** — `feat/12-bidirectional-device-transfer` → `main`; body carries
`Closes #<issue>` (open the tracking issue before the PR per the project's
forge convention).

## Deploy & rollback

- **Migration order:** `0013_receive_slots.sql` is additive (new table, no
  backfill); `npm run deploy` applies it to remote D1 idempotently before
  `wrangler deploy`. No data migration.
- **Rollback:** revert the PR. The orphaned `receive_slots` table is harmless (no FK,
  no reads once the code is gone) and may be dropped in a later cleanup migration if
  desired. No feature flag — the receive affordance simply appears on `/activar`.

## Open questions / risks

- **Poll `204`-vs-`410` disambiguation.** When the consume `UPDATE` matches no row,
  the endpoint must distinguish "still pending" from "expired/gone" — resolved with a
  follow-up `SELECT expires_at, consumed_at FROM receive_slots WHERE code = ?`
  (cheap, indexed). If absent or past expiry → `410`; else → `204`. Settled in
  implementation; noted so the implementer doesn't collapse both to one status.
- **Receive-QR griefing.** Anyone who scans the on-screen receive QR before the
  intended phone can deposit *their own* card (proven by their own secret), and the
  generator would adopt it. Mitigated by single-use (first deposit wins), 5-minute
  TTL, and high code entropy (32^6). The generator's user is watching the screen and
  can regenerate if they receive the wrong card. Accepted; same trust posture as the
  existing push code. Do **not** widen the QR's exposure (e.g. no deep-linking the
  receive code into shareable URLs beyond the on-screen QR).
- **Trivial-card threshold.** "Trivial" = 0 marks **and** not in a group **and** not
  completed. A registered-but-unmarked card is still trivial for silent-replace
  purposes (nothing to lose). Confirm this matches the marks/group signals already
  available client-side in `recoverFromUrl()`; if registration alone should block
  silent replace, tighten during P3.
- **Two open game tabs on the generator.** The poll runs on `/activar`; once it
  redirects to `/?card=&k=`, only that tab adopts. No multi-tab coordination needed.
- **Privacy/legal.** No new processor and no new personal-data category
  (`result_card_id` is a public card id, transient, ≤ 5 min). `docs/legal` /
  `privacidad.astro` need no change beyond the card/secret model already disclosed —
  confirm during P4.

## Deliverables

- `migrations/0013_receive_slots.sql`
- `src/pages/api/receive-slot/index.ts` — `POST` create
- `src/pages/api/receive-slot/[code]/deposit.ts` — `POST` deposit
- `src/pages/api/receive-slot/[code].ts` — `GET` poll
- `src/lib/api.ts` — `createReceiveSlot` / `depositToReceiveSlot` / `pollReceiveSlot`
- `src/pages/activar.astro` — receive mode + scanner deposit / no-card branches
- `src/pages/index.astro` — collision guard in `recoverFromUrl()` + generalized
  conflict dialog wiring
- `docs/features/12-bidirectional-device-transfer/{SPEC,PLAN,TASKS}.md`
- `docs/features/ROADMAP.md` — row 12 updated (size M, summary, SPEC pointer)

## Post-merge next feature

`06-achievements-badges` (or `07-situations-total-count` as a quick win) per
`docs/features/ROADMAP.md`.
