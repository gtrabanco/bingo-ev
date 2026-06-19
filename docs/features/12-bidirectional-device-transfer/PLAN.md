# 12 — bidirectional-device-transfer · PLAN

Execution plan derived from `SPEC.md`. One phase per commit; `npm run build` green
before each commit. Read the SPEC's Design + Architecture impact before P1.

## Sequencing rationale

The pull direction is built bottom-up (data → server → client API → page UI) so each
layer is gate-verifiable on its own, then the collision guard is layered last because
it touches the shared, already-shipped push path and must not regress it.

```
P1 schema+endpoints  →  P2 /activar UI  →  P3 collision guard  →  P4 hardening  →  P5 PR
   (receive_slots,        (receive mode,      (generalize fx-10      (copy, docs,
    3 endpoints,           deposit, no-card     dialog, recoverFromUrl  scenarios)
    api.ts helpers)        branches, poll)      wiring)
```

## Phase detail

### P1 — Schema + endpoints (backend only)

- `migrations/0013_receive_slots.sql` — additive table per SPEC Design; **do not**
  touch `device_codes`.
- `src/pages/api/receive-slot/index.ts` — `POST` create (CREATE limiter, GC batch).
- `src/pages/api/receive-slot/[code]/deposit.ts` — `POST` deposit (WRITE limiter,
  ownership proof, atomic write-once).
- `src/pages/api/receive-slot/[code].ts` — `GET` poll (no IP limit, atomic
  consume-once, `204`/`200`/`410` with the pending-vs-gone follow-up `SELECT`).
- `src/lib/api.ts` — `createReceiveSlot`, `depositToReceiveSlot`, `pollReceiveSlot`
  (each degrades to `null`/`false`/`'pending'`).
- Apply locally: `npx wrangler d1 migrations apply ev-bingo --local`.
- **Verify:** curl/console the three endpoints (create → deposit → poll happy path;
  double-deposit → 410; wrong secret → 403; poll-after-consume → 410). Gate green.

### P2 — `/activar` bidirectional UI

- Receive mode (no card, no params): "Recibir un cartón aquí" → `createReceiveSlot`
  → render code + QR (`/activar?recv=CODE`, reuse `renderDeviceCodeQr` approach) +
  countdown → poll every 3 s → on result `location.href = /?card=ID&k=SECRET`; on
  `'gone'`/expiry stop + caducado message.
- Scanner branch (`?recv=CODE`): card present → deposit prompt with alias →
  `depositToReceiveSlot` → success/failure copy; card absent → "no card to send".
- Leave the server-side `?code=` auto-claim and the manual-entry form intact.
- **Verify:** two browser contexts — `recv:happy`, `recv:no-card-scanner`,
  `recv:expired`, `recv:double-deposit`, and `push:happy` regression. Gate green.

### P3 — Collision guard

- Generalize feature 10's conflict dialog so its "discard the loser" branch supports
  the local `discardCard(id, secret)` path (no account), keeping the account DELETE
  path for logged-in users.
- In `recoverFromUrl()`: classify the current card (trivial vs non-trivial vs equal),
  branch to silent-adopt / conflict-dialog / no-op per SPEC. Wire the group-owner
  confirmation step through the existing deletion paths (settles departures).
- **Verify:** `collision:non-trivial`, `collision:trivial-silent`,
  `collision:group-owner`, plus re-run `push:happy` and a recovery-link adopt to
  confirm no regression. Gate green.

### P4 — Hardening + copy + docs

- Finalize es-ES copy against `docs/frontend/COPYWRITING.md` (tone, no brands).
- Accessibility pass on the new `/activar` controls (`docs/frontend/ACCESSIBILITY.md`):
  the receive button, the live countdown (`aria-live`), the QR `aria-hidden`, and
  deposit status announcements — mirror the existing device-code panel.
- Confirm `docs/architecture/ARCHITECTURE.md` needs no new invariant, or add one line
  noting the pull receive-slot alongside the push device-code.
- Confirm `docs/legal` / `privacidad.astro` need no change (no new processor/data).
- Run the full `transfer:degraded` scenario (Worker down at each step). Gate green.

### P5 — PR

- Open the tracking issue (forge convention); branch `feat/12-bidirectional-device-transfer`.
- One PR against `main`, `Closes #<issue>` in the body, English. Never stack.

## Risks carried into execution

- **Push regression** — P3 edits the shared `recoverFromUrl()`; the trivial-card
  silent path must keep the current empty-scanner push UX byte-for-byte.
- **Poll status ambiguity** — implement the pending-vs-gone follow-up `SELECT` in P1
  so P2's loop reads clean signals.
- **Dialog reuse coupling** — generalizing the feature-10 dialog must not break its
  existing account-scoped callers; verify multi-card-conflict still works in P3.

## Verification gate

Every phase: `npm run build` green + the phase's named dev scenarios reproduced in a
browser. No test suite, no linter (per `CLAUDE.md`).
