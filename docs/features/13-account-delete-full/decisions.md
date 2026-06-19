# Feature 13 — decisions

Decisions made during planning (D1–D3 in `SPEC.md`) and review triage (D4–D5).

## D1 — Delete completed diplomas too

**Decided: yes.** "Borrar todo" is total RGPD art. 17 erasure. Overrides
completed-card immunity for this explicit-request path only. `/v/{id}` and gallery
entries for those cards disappear. *(Owner decision — see SPEC.)*

## D2 — Only "Borrar todo" exposed

**Decided: yes.** The previous unlink-only behaviour is replaced, not kept as a
second option. *(Owner decision — see SPEC.)*

## D3 — Repurpose `DELETE /api/account` vs new route

**Decided: repurpose.** The old unlink endpoint had no UI caller, so changing its
behaviour breaks nothing; a second route is dead weight against flat architecture.

## D4 — Group settlement runs outside the atomic delete batch

**Decided: accept.** The `DELETE FROM cards/sessions/accounts` runs as one D1
`batch()` (atomic). `settleDeparture` (per group) and `orphanedOwnerRepair` run
**after**, in separate statements, because `settleDeparture` must re-read
*post-delete* membership to pick the most-veteran remaining owner.

**Why:** if a `settleDeparture` call throws mid-loop, the account and cards are
already gone but a group could be left with a stale owner/winner pointer. This is
healed by `orphanedOwnerRepair` (run at the end of this request) and by the
opportunistic GC batches on card-issue / group-create, which call
`orphanedOwnerRepair` as a backstop.

**How to apply:** acceptable for a parody app with no money at stake; do not add a
distributed transaction. Surfaced from review finding #2. Also recorded in
`SPEC.md` → Open questions / risks.

## D5 — Mid-flight cancel does not abort the deletion

**Decided: accept.** Once "Sí, bórralo todo" is clicked, `deleteAccount()` is
in flight. The cancel button ("Mejor no") is not disabled, so a user *can* click it
during the request; the dialog closes but the server-side deletion still completes.
On success the page reloads regardless (the account is genuinely gone, so reloading
to a logged-out state is correct); on failure the error write targets a closed
dialog (invisible, harmless).

**Why:** a network request already sent cannot be reliably aborted, and the deletion
is the user's just-confirmed intent. Adding an `AbortController` would only cancel
the *client's* wait, not the server's commit — misleading.

**How to apply:** leave as-is. Surfaced from review finding #3.
