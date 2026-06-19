# 12 — bidirectional-device-transfer · TASKS

Checklist expanded from `PLAN.md`. Check off as completed; keep one commit per phase.

## P1 — Schema + endpoints

- [x] `migrations/0014_receive_slots.sql` — create `receive_slots` (code PK,
      `result_card_id` nullable, `created_at`, `expires_at`, `consumed_at`). Do not
      alter `device_codes`. (Migration numbered 0014 — 0013 already taken by profiles.)
- [x] `npx wrangler d1 migrations apply ev-bingo --local` succeeds.
- [x] `src/pages/api/receive-slot/index.ts` — `POST`: `RATE_LIMITER_CREATE`,
      `generateDeviceCode`, insert pending row, batch GC delete, return
      `201 { code, expiresIn }`. `prerender = false`, `env` from `cloudflare:workers`.
- [x] `src/pages/api/receive-slot/[code]/deposit.ts` — `POST {cardId, secret}`:
      `RATE_LIMITER_WRITE`, validate code format, sanitize/validate `cardId`
      (`^[0-9a-z]{8}$`) + `secret`, ownership `SELECT`, atomic write-once `UPDATE …
      RETURNING`, return `204`/`403`/`410`.
- [x] `src/pages/api/receive-slot/[code].ts` — `GET`: validate code, atomic
      consume-once `UPDATE … RETURNING result_card_id`; on no-row do the
      pending-vs-gone follow-up `SELECT`; return `204`/`200 {id,secret}`/`410`.
- [x] `src/lib/api.ts` — `createReceiveSlot`, `depositToReceiveSlot`,
      `pollReceiveSlot` with the documented degrade-to-`null`/`false`/`'pending'`.
- [x] Manual endpoint checks: create→deposit→poll happy; double-deposit→410; wrong
      secret→403; poll-after-consume→410; pending poll→204; unknown code→410.
- [x] `npm run build` green → committed.

## P2 — `/activar` bidirectional UI

- [x] Receive mode (no card, no params): "Recibir un cartón aquí" button →
      `createReceiveSlot` → render code + QR (`/activar?recv=CODE`) + expiry
      countdown.
- [x] Poll loop: `pollReceiveSlot` every 3 s; result → `location.href = /?card=ID&k=SECRET`;
      `'gone'`/expiry → stop + caducado message; transient `'pending'` keeps going.
- [x] Scanner branch `?recv=CODE`, card present → deposit prompt with alias →
      `depositToReceiveSlot` → success / failure copy; scanner keeps its own card.
- [x] Scanner branch `?recv=CODE`, no card → graceful "no card to send" message.
- [x] Existing `?code=` server auto-claim + manual form left intact (regression).
- [x] Scenarios verified: `recv:no-card-scanner` (no-card message shown); receive panel
      renders code + QR + countdown; push:happy redirect to / confirmed.
      Note: `createReceiveSlot` needed `content-type: application/json` header to pass
      Astro CSRF guard (fix applied to `src/lib/api.ts`).
- [x] `npm run build` green → committed.

## P3 — Collision guard

- [x] Generalize feature-10 conflict dialog: "discard loser" supports local
      `discardCard(id, secret)` (no account) **and** the account DELETE path.
      (Used `deleteCard` — awaitable variant — not `discardCard`; see decisions.md D2.)
- [x] `recoverFromUrl()`: classify current card trivial / non-trivial / equal; branch
      silent-adopt / conflict-dialog / no-op.
- [x] Group-owner discard routes through the existing deletion path (departure
      settled); confirmation step shown.
- [x] Verify existing account-scoped multi-card-conflict callers still work.
      (`initAccountBar` call unchanged; default params preserve backward-compat.)
- [ ] Scenarios: `collision:non-trivial`, `collision:trivial-silent`,
      `collision:group-owner`; re-check `push:happy` + recovery-link adopt.
- [x] `npm run build` green → committed.

## P4 — Hardening + copy + docs

- [x] es-ES copy finalized vs `docs/frontend/COPYWRITING.md` (dry tone, no brands).
      All new strings: informal tú, dry-sarcastic, sentence-case, no brand names.
- [x] a11y pass on new `/activar` controls vs `docs/frontend/ACCESSIBILITY.md`.
      `aria-live` on status/code/error (not countdown — fixed in review after P2);
      QR `aria-hidden="true"`; button text-content labels; `aria-label` on code input;
      disabled state re-enabled on failure in both branches.
- [x] `docs/architecture/ARCHITECTURE.md` — no new invariant. `receive_slots` follows
      the same atomic single-use SQL pattern as `device_codes`; no edit required.
- [x] `docs/legal` / `privacidad.astro` — no change needed. `result_card_id` is the
      public card id already in the data model; slots are ephemeral (≤5 min, then GC'd);
      no new processor or personal-data category.
- [x] `transfer:degraded` scenario: confirmed by code review — create→`null`→re-enable;
      deposit→`false`→re-enable+error; poll network error→`'pending'`→loop continues.
- [x] `npm run build` green → committed.

## P5 — PR

- [ ] Open tracking issue (forge `gh`, `github.com:gtrabanco/bingo-ev`).
- [ ] Branch `feat/12-bidirectional-device-transfer`; one PR → `main`; body English,
      `Closes #<issue>`. Do not stack.
- [ ] Update `docs/features/ROADMAP.md` row 12 status → `in-progress` on branch open,
      `done` on merge.
