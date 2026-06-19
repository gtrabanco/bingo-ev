# 12 — bidirectional-device-transfer · Known issues

## KI-1 — Secret briefly visible to a shoulder-surfer via receive QR

**Severity:** low  
**Class:** intentional-tradeoff (documented in `decisions.md#D1`)

A device that photographs the receive QR (`/activar?recv=CODE`) before the
generator's first successful poll could, in theory, race the generator and retrieve
the deposited card's secret via `GET /api/receive-slot/:code`. The slot is consumed
on first call, so only one device can win, but a physical eavesdropper with camera
access could intercept.

Accepted: same trust posture as the existing push code, proximity-gated, narrow
3-second window, ~10⁹ code space. No mitigations planned.

---

## KI-2 — Poll returns `gone` on transient server 5xx

**Severity:** low  
**Tracked:** [#27](https://github.com/gtrabanco/bingo-ev/issues/27)

`pollReceiveSlot` maps any non-204/200 response to `'gone'`, which stops the poll
loop and shows "El código ya no está disponible." to the generator. A transient 5xx
(Worker restart, D1 hiccup) during a valid slot's lifetime would prematurely abort an
in-flight transfer. The slot itself is unaffected and the depositor's card is safe;
only the generator's UI breaks.

Workaround: generator clicks "Recibir un cartón aquí" again to create a new slot.

---

## KI-3 — "No hay cartón" copy covers secretless-card edge case

**Severity:** low  
**Trigger:** no issue; accepted as-is (see rationale below)

A device holding a card that was created entirely offline (no server round-trip →
`secret` is `null`) sees "Aquí no hay ningún cartón que enviar." on `?recv=CODE`,
which is technically misleading — the card exists but is not transferable.

Accepted as-is for now; consistent with the push path hiding its button for
secretless cards. A secretless card cannot be deposited (the ownership proof requires
a secret), so the message is functionally correct even if wording is imprecise.

---

## KI-4 — Discarded local card leaves an orphaned localStorage entry

**Severity:** low (negligible)  
**Trigger:** none — dropped; document-only

On local keep-incoming collision resolution, `deleteCard(existing)` removes the card
server-side and `saveCard(incoming)` repoints `CURRENT_CARD_KEY`, but the discarded
card's `evbingo.card.<id>` localStorage entry is not explicitly removed. It is orphaned
(nothing points to it) and overwritten on the next collision.

Dropped: a single stale key with no behavioral impact; adding cleanup code would be
churn for no user-visible benefit. Recorded for completeness only.
