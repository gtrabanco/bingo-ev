# 05 — accounts · Decisions

## D1 — Secret-less card claim via `link-card`

`POST /api/account/link-card` uses `WHERE id = ? AND (secret = ? OR secret IS NULL)`.
This means any logged-in user who knows an 8-char card id can link a secret-less
card to their account.

**Rationale:** secret-less cards are legacy rows created before the `cards.secret`
column was added (all new cards get a secret). Linking them is additive: the card's
marks and state are unaffected, and the attacker gains nothing beyond a history entry
they can delete. The 8-char id space (~2.8 trillion possibilities) makes enumeration
impractical. Accepted as low risk.

## D2 — Card secret travels in redirect URL after device-code claim

After a successful device-code claim (both QR path via `activar.astro` and the
manual form), the receiving device is redirected to `/?card=ID&k=SECRET`. The secret
is therefore briefly visible in the browser history and in server access logs.

**Rationale:** this matches the existing recovery-link convention (`?card=ID&k=SECRET`
in email links). The client-side game code strips `k` from the URL immediately after
reading it (`history.replaceState`). The window of exposure (URL visible before the
JS runs) is the same as with recovery links, which the project already accepts.
No change needed; convention documented here for auditor awareness.
