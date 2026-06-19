# 12 — bidirectional-device-transfer · TASKS

Checklist expanded from `PLAN.md`. Check off as completed; keep one commit per phase.

## P1 — Schema + endpoints

- [ ] `migrations/0013_receive_slots.sql` — create `receive_slots` (code PK,
      `result_card_id` nullable, `created_at`, `expires_at`, `consumed_at`). Do not
      alter `device_codes`.
- [ ] `npx wrangler d1 migrations apply ev-bingo --local` succeeds.
- [ ] `src/pages/api/receive-slot/index.ts` — `POST`: `RATE_LIMITER_CREATE`,
      `generateDeviceCode`, insert pending row, batch GC delete, return
      `201 { code, expiresIn }`. `prerender = false`, `env` from `cloudflare:workers`.
- [ ] `src/pages/api/receive-slot/[code]/deposit.ts` — `POST {cardId, secret}`:
      `RATE_LIMITER_WRITE`, validate code format, sanitize/validate `cardId`
      (`^[0-9a-z]{8}$`) + `secret`, ownership `SELECT`, atomic write-once `UPDATE …
      RETURNING`, return `204`/`403`/`410`.
- [ ] `src/pages/api/receive-slot/[code].ts` — `GET`: validate code, atomic
      consume-once `UPDATE … RETURNING result_card_id`; on no-row do the
      pending-vs-gone follow-up `SELECT`; return `204`/`200 {id,secret}`/`410`.
- [ ] `src/lib/api.ts` — `createReceiveSlot`, `depositToReceiveSlot`,
      `pollReceiveSlot` with the documented degrade-to-`null`/`false`/`'pending'`.
- [ ] Manual endpoint checks: create→deposit→poll happy; double-deposit→410; wrong
      secret→403; poll-after-consume→410; expired→410.
- [ ] `npm run build` green → commit `feat(device-transfer): add receive-slot table + pull endpoints`.

## P2 — `/activar` bidirectional UI

- [ ] Receive mode (no card, no params): "Recibir un cartón aquí" button →
      `createReceiveSlot` → render code + QR (`/activar?recv=CODE`) + expiry
      countdown.
- [ ] Poll loop: `pollReceiveSlot` every 3 s; result → `location.href = /?card=ID&k=SECRET`;
      `'gone'`/expiry → stop + caducado message; transient `'pending'` keeps going.
- [ ] Scanner branch `?recv=CODE`, card present → deposit prompt with alias →
      `depositToReceiveSlot` → success / failure copy; scanner keeps its own card.
- [ ] Scanner branch `?recv=CODE`, no card → graceful "no card to send" message.
- [ ] Existing `?code=` server auto-claim + manual form left intact (regression).
- [ ] Scenarios: `recv:happy`, `recv:no-card-scanner`, `recv:expired`,
      `recv:double-deposit`, `push:happy`.
- [ ] `npm run build` green → commit `feat(device-transfer): receive mode + deposit on /activar`.

## P3 — Collision guard

- [ ] Generalize feature-10 conflict dialog: "discard loser" supports local
      `discardCard(id, secret)` (no account) **and** the account DELETE path.
- [ ] `recoverFromUrl()`: classify current card trivial / non-trivial / equal; branch
      silent-adopt / conflict-dialog / no-op.
- [ ] Group-owner discard routes through the existing deletion path (departure
      settled); confirmation step shown.
- [ ] Verify existing account-scoped multi-card-conflict callers still work.
- [ ] Scenarios: `collision:non-trivial`, `collision:trivial-silent`,
      `collision:group-owner`; re-check `push:happy` + recovery-link adopt.
- [ ] `npm run build` green → commit `feat(device-transfer): collision guard on card adopt`.

## P4 — Hardening + copy + docs

- [ ] es-ES copy finalized vs `docs/frontend/COPYWRITING.md` (dry tone, no brands).
- [ ] a11y pass on new `/activar` controls vs `docs/frontend/ACCESSIBILITY.md`
      (button label, `aria-live` countdown/status, QR `aria-hidden`).
- [ ] `docs/architecture/ARCHITECTURE.md` — confirm no new invariant, or add a
      one-line pull-slot note next to the push device-code note.
- [ ] `docs/legal` / `privacidad.astro` — confirm no change needed (no new
      processor/data).
- [ ] `transfer:degraded` scenario passes (Worker down at create/deposit/poll).
- [ ] `npm run build` green → commit `chore(device-transfer): copy, a11y, docs`.

## P5 — PR

- [ ] Open tracking issue (forge `gh`, `github.com:gtrabanco/bingo-ev`).
- [ ] Branch `feat/12-bidirectional-device-transfer`; one PR → `main`; body English,
      `Closes #<issue>`. Do not stack.
- [ ] Update `docs/features/ROADMAP.md` row 12 status → `in-progress` on branch open,
      `done` on merge.
