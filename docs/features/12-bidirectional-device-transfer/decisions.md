# 12 — bidirectional-device-transfer · Decisions

## D2 — Local conflict resolution uses `deleteCard` (awaitable), not `discardCard` (fire-and-forget)

**Decision:** In the no-account collision path, the "keep incoming" resolution calls the
awaitable `deleteCard(id, secret)` rather than the fire-and-forget `discardCard`.

**Why:** The conflict dialog is open when the delete fires; if it fails, the player must see
the error and be able to retry. `discardCard` returns nothing and the error is swallowed.
`deleteCard` returns a boolean, so the dialog can surface "No se pudo eliminar el cartón anterior."

**How to apply:** Any new UI-driven deletion that needs to show a failure message should use
`deleteCard`; background / GC-style deletion keeps using `discardCard`.

---

## D1 — Secret exposure via shoulder-surf (intentional tradeoff)

**Decision:** Accept the risk of a shoulder-surfer photographing the receive QR and
racing the generator's 3-second poll to capture the deposited card's secret.

**Why accepted:**
- Same trust posture as the existing push code (`?code=`), which shows the code on
  screen by design — the feature is proximity-gated.
- The race window is narrow: the generator's poll fires within 3 s of deposit; the
  secret is returned once and then the slot is consumed.
- Code entropy: `generateDeviceCode()` returns a 6-char alphanumeric, ~32⁶ ≈ 10⁹
  combinations — brute-force is not the threat model.
- Physical proximity is a prerequisite; this is not a remote attack.

**Recorded in:** `known-issues.md` (public-facing risk register).
