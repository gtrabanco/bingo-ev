# 01 — final-certificate-design · Decisions

## D1 — Google Fonts `@import` removed from `homeSvg` (P3)

**Decision:** Removed the `@import url('fonts.googleapis.com/...')` from
`homeSvg` in `og-image.ts`, even though the SPEC lists "The home OG image
(`homeSvg`)" as out of scope.

**Why:** TASKS.md acceptance criterion says "Verify no `fonts.googleapis.com`
remains anywhere." The import in `homeSvg` was always a no-op (Georgia is not
served by Google Fonts), so removing it is zero-risk and aligns with the project
rule "no webfonts." Leaving it would have left a misleading, rule-violating dead
line in the file while P3 claimed the rule was now satisfied.

**Impact:** None — the import was never executed by any crawler or renderer.
`homeSvg`'s visual output is identical before and after.

## D2 — Scope expanded & bundled into this branch (owner override, 2026-06-15)

**Decision:** Two further work-streams — **Feature A (diploma lifecycle/integrity)**
and **Feature B (abuse prevention)** — are implemented on `feat/01-final-
certificate-design` and ship in the **same PR** as the design work (phases P4–P7).

**Why:** The owner asked to "integrate A/B into this feature." The assistant
surfaced that this contradicts the project's hard convention *"one PR per unit of
work, never bundle/stack"* (CLAUDE.md → PR & branch workflow) and grows the PR;
the owner chose to bundle anyway, with the trade-off explicit. Recorded here so
`audit-pr` treats the multi-concern PR as **deliberate, not drift**.

**Mitigation:** A and B are split into reviewable phases (P4, P5, P6, P7) with a
review checkpoint after each pair, so the bundle is still reviewed in slices.

## D3 — Unmark-after-completion policy

**Decision:** Within **24 h** of completion, un-marking a cell that breaks the
bingo **invalidates** the diploma (`completed_at → NULL`, card back to in-progress,
recompletable). After 24 h the marks are **locked** (server rejects changes, 409;
client disables the grid).

**Why (options weighed):** the owner's original idea was "delete the card after
24 h." Chose **lock over delete** — same anti-cheat effect, no accidental data
loss, and it avoids adding a `settleDeparture` path on the unmark route. Server
clock is authoritative (consistent with existing expiry rule).

## D4 — Completed-card retention = 12 months

**Decision:** Completed cards are deleted **12 months** after `completed_at`,
replacing the current "immune forever" rule. The GC sweep runs `settleDeparture`
for grouped cards.

**Why:** "forever" is a SPAM/bloat vector. 12 months keeps a shared diploma link
alive well beyond the joke's shelf life while bounding D1 growth; the real spam
defense is Feature B (rate-limit + Turnstile at ingress), so retention can stay
generous rather than aggressively short.

## D6 — 12-month GC: no mirror in `groups/index.ts` (P5)

**Decision:** The 12-month completed-card sweep lives only in `cards/index.ts`
(the `POST /api/cards` opportunistic GC batch). `groups/index.ts` already sweeps
empty rooms older than 1 month; no mirror of the completed-card sweep is added
there.

**Why:** The completed-card sweep in `cards/index.ts` is comprehensive — it
handles both ungrouped and grouped cards (settling departure for grouped ones
before deletion). Adding an identical sweep to `groups/index.ts` would duplicate
SQL without additional correctness benefit. The `orphanedOwnerRepair` backstop
covers any residual inconsistency if the sweep fires from one endpoint and not
the other.

## D7 — Turnstile site key in `.env`, not `wrangler.jsonc` vars (P6)

**Decision:** `PUBLIC_TURNSTILE_SITE_KEY` is a Vite/Astro build-time env var (from
`.env`, gitignored) rather than a `wrangler.jsonc` `vars` entry.

**Why:** `src/pages/index.astro` is a **prerendered static page** (no `export const
prerender = false`). It cannot access Worker runtime vars at build time — only
`import.meta.env.*` (Vite) is available. `g/[id].astro` is SSR and could use
`env.*`, but using the same mechanism everywhere avoids confusion.

**Production setup:** set `PUBLIC_TURNSTILE_SITE_KEY` in Cloudflare Workers Builds
environment variables (dashboard → Settings → Variables); set `TURNSTILE_SECRET_KEY`
via `wrangler secret put` (never in `wrangler.jsonc`). The `.env` file (gitignored)
holds the test site key `1x00000000000000000000BB` for local dev; `.dev.vars` has the
corresponding test secret `1x0000000000000000000000000000000AA`.

## D5 — Abuse-prevention mechanism = full stack, scoped by endpoint

**Decision:** **Turnstile** on the endpoints that create resources / send email
without requiring a pre-existing owned card (`POST /api/cards`, `/api/recover`,
`/api/groups`, `/api/groups/[id]/join`) + **rate-limiting** (Workers binding,
per-IP) on **all** write endpoints, with **WAF** rate rules as the edge layer.

**Why:** the owner chose "apply everything." But Turnstile tokens are single-use
and short-lived, so they **cannot** gate the high-frequency, debounced
`marks`/`complete`/`alias` syncs (which already require the owner secret, so they
are not anonymous-spam vectors) — those get rate-limit only. Turnstile + the
rate-limit binding are Cloudflare **platform** features, so the "no new npm
dependency" rule is preserved. Turnstile secret via `wrangler secret put`
(`BREVO_API_KEY` pattern); cookieless → minor `/privacidad` disclosure.
