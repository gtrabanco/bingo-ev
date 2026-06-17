---
feature: 03-public-gallery
updated: 2026-06-17
---

# Decisions

## 200 + `nickError` instead of SPEC's 422 for blocked nick

**Decision:** When a nick is blocked by the blocklist (reserved / nsfw / pattern), the
`POST /api/cards/:id/complete` endpoint returns **200 with `{ nickError: "<message>" }`**
instead of the 422 prescribed in the SPEC.

**Why:** `src/lib/api.ts`'s `request<T>()` helper returns `null` on any non-ok response
(the offline-first degradation contract). A 422 would make `reportCompletion()` return null,
discarding the `completedAt` from the response body. The client would not know the win landed
and could prompt the player to try again, potentially writing a double-completion. The
200+nickError field keeps the receipt flow intact: the win is always recorded, the client
receives `completedAt`, and the `nickError` string (if present) is surfaced as a toast
prompting the player to choose a different name.

**Scope of the divergence:** The nick is nulled server-side (no name is stored), so the
diploma is issued anonymous. The player can re-submit with a different nick at any time via
the same endpoint (already-completed path: `UPDATE cards SET nick = ?2 WHERE id = ?1`).

## Over-fetch for honorific filtering

**Decision:** The gallery API fetches `PAGE_SIZE * OVER_FETCH` rows from D1 to compensate for
post-SQL filtering by honorific tier.

**Why:** `honorificFor` is computed from the packed `marks` string (`^[012]{12}$`) in the
Worker. SQLite has no built-in function to compute it. Alternatives (stored generated column,
materialized honorific column) would require a migration and denormalization. Over-fetch
(factor 3, PAGE_SIZE=24) was chosen as the simplest correct option; for the expected data
volumes it adds negligible latency.

## Nick blocklist: two categories + patterns

**Decision:** `reserved` words return `"Nombre reservado"`, `nsfw` words return
`"Nombre inapropiado"`, and pattern violations (@ / domain regex) return `"Nombre no
permitido"`. These are distinct user-facing messages because they convey different UX
intent: `reserved` hints at administrative protection, `nsfw` at community standards,
`pattern` at formatting rules.

## Opt-out gallery listing

**Decision:** All completed diplomas are listed in `/galeria` by default; owners can hide
theirs via the in-game toggle. This is disclosed in `/privacidad` (gallery section) with
a takedown contact.

**Why:** The gallery's value scales with participation. Opt-in would yield a sparse gallery
at launch. GDPR basis: legitimate interest in discoverability of already-public URLs; the
hide control and takedown path satisfy the right-to-erasure obligation without requiring
deletion of the diploma itself.

## Profile deferred to feature 09

**Decision:** Per-person profile pages (aggregating all diplomas by nick) are deferred to
`09 gallery-profiles`, which depends on `05 accounts` for stable identity.

**Why:** The current identity model has no unique-nick guarantee. Aggregating by raw nick
would create false groupings (two players could share a nick) and false splits (diacritics
or capitalization variants). This is a structural constraint, not a timeline convenience.
