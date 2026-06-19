# 12 — bidirectional-device-transfer · Progress

## P1 — Schema + endpoints (done)

Shipped: `migrations/0014_receive_slots.sql` (additive, 0013 was already taken by
profiles); `POST /api/receive-slot` (create); `POST /api/receive-slot/:code/deposit`
(scanner proves ownership, atomic write-once); `GET /api/receive-slot/:code` (poll
with pending-vs-gone follow-up SELECT); three client helpers in `src/lib/api.ts`.

All manual endpoint scenarios passed. Build green. Migration note captured in TASKS.

**Left open for P2:** `/activar` bidirectional UI (receive mode + scanner branches).
