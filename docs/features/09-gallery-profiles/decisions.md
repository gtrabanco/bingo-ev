# 09 — gallery-profiles · Decisions

> Architecture and design choices made during execution that aren't obvious from
> the SPEC. Recorded so reviewers and future contributors understand the WHY.

## D-exec-1 — Handle validation inlined in the endpoint (P1)

**Decision:** the handle normalization + slug regex lives inside
`src/pages/api/account/profile.ts` rather than a separate `src/lib/profile.ts`
helper file.

**Why:** the TASKS called for a shared helper, but in P1 there is exactly one
consumer (the endpoint). Extracting a 4-line function into its own lib file when
no other file needs it is premature abstraction. If P3's UI validation wants the
same regex, extract it then.

## D-exec-2 — Blocklist rejection returns a human-readable Spanish string as the error code (P1)

**Decision:** when `checkNick()` blocks a handle, the endpoint returns
`{error: "Nombre reservado"}` (or `"Nombre inapropiado"` / `"Nombre no permitido"`)
rather than a machine code like `blocked_handle`.

**Why:** this reuses the established nick-flow convention
(`BLOCK_MESSAGES` from `src/lib/blocklist.ts`, same values the gallery and
completion endpoints return). The P3 opt-in UI already has to handle two error
shapes — `handle_invalid` / `handle_taken` (machine codes) and the blocklist
strings — and is expected to render them verbatim. Changing to a machine code
with a separate message field would diverge from the nick-flow convention
without adding value.

**Impact on P3:** the UI must branch on both shapes: `error === 'handle_invalid'`
or `error === 'handle_taken'` for those two; all other non-null errors are
renderable verbatim (they are already Spanish user-facing strings).

## D-exec-3 — Gallery sibling_count reflects total unfiltered diplomas (P3)

**Decision:** the `sibling_count` computed in `queryGallery` counts all of an
account's listed completed diplomas (`gallery_hidden = 0 AND completed_at IS NOT
NULL`) without applying the blocklist filter that the display pipeline applies
after fetching rows.

**Why:** applying the blocklist inside a correlated SQL subquery would require a
`NOT IN (...)` clause with every blocked nick, coupling the query to the blocklist
at the DB layer. The divergence only materialises if a stored nick is *later*
added to the blocklist — a rare event — and the consequence is a counter that
reads slightly higher than the visible profile page count.

**Accepted risk:** the link target is the profile page (which applies the
blocklist correctly); the counter is informational, not authoritative. The
discrepancy is self-correcting once the account owner updates their nick or the
blocklisted card expires.
