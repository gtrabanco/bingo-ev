# 01 — final-certificate-design · PLAN

> Execution plan derived from `SPEC.md`. Phases are independently gate-verified
> (`npm run build` green + manual visual check). One commit per phase.

## Phase map

| Phase | Outcome | Gate |
|---|---|---|
| P1 | Shared design module; no visual change | build green; PNG looks identical to before |
| P2 | Final PNG design | build green; 3 honorifics visually verified |
| P3 | OG card parity + endpoint honorific + drop webfont | build green; OG SVG visually verified |
| P4 | Feature A: unmark invalidation (<24h) + lock (>24h) | build green; grace/lock verified in dev |
| P5 | Feature A: 12-month retention GC + settleDeparture | build green; sweep verified against local D1 |
| P6 | Feature B: Turnstile on 4 creation/email endpoints | build green; gated endpoints reject bad token |
| P7 | Feature B: rate-limiting on all writes + WAF docs | build green; 429 past limit |
| P8 | PR to `main` | build green; companion reviews; roadmap `done` |

> P1–P3 done. P4–P8 added by the 2026-06-15 scope expansion (see SPEC).
> Review checkpoints: after P4+P5, after P6+P7, before P8.

## P1 — Shared design module (refactor, no visual change)

Create `src/lib/certificate-design.ts` exporting:

- `PALETTE` — every hex currently inlined in `certificate.ts` / `og-image.ts`
  (`#f6f0df` paper, `#11503c` frame green, `#b02e22` dauber red, `#221f1a` ink,
  `#6b6354`/`#7c7464`/`#8a8170` muted, `#b8ab8c` rule).
- `HONORIFICS: Record<Honorific, { title; color; line }>` — moved verbatim from
  `certificate.ts`.
- Shared copy constants (eyebrow, certifying body lines, legal-joke footer,
  verify label, `FALLBACK_NICK`).
- Font stacks (`SERIF`, `SANS`, `MONO`).

Repoint `certificate.ts` to import from it. **No pixel change** — pure extraction.
Verify the PNG looks byte-for-byte the same as before.

## P2 — Final PNG design

Elevate `drawCertificate` using the shared tokens. Levers (decide concretely
while implementing, keep within the aged-paper/green-frame/dauber language):

- Frame: double border + corner ornaments.
- Honorific as a **seal/stamp** (rotated, ruled border) echoing `.expired-stamp`.
- Stronger type hierarchy and vertical rhythm; keep every existing content row.
- QR seal corner treatment crisper (keep integer-module scaling).

Visual-verify each honorific variant downloads a finished-looking PNG.

## P3 — OG parity

- Rebuild `diplomaSvg` to the same document at 1200×630: same paper, frame,
  `¡BINGO!`, nick, **honorific seal**, date, verify URL.
- Remove the `@import url('fonts.googleapis.com/...Georgia')`; use the shared
  `SERIF` system stack.
- Add honorific to the OG data path: in `src/pages/og/diploma/[id].svg.ts` select
  `marks`, derive via `honorificFor`, pass into `diplomaSvg`.
- Keep `escapeXml` on all interpolated user text (nick).
- Decide: include a small QR on the OG card or not (default: no — keep it light).

Visual-verify `/og/diploma/<id>.svg` for each honorific.

## P4 — Feature A: unmark invalidation + lock

Server is authoritative. Steps:

1. `src/lib/card.ts`: add `MARKS_LOCK_HOURS = 24`, `marksLockAt(completedAt)`,
   `areMarksLocked(completedAt, now = new Date())`. Pure, shared by client + Worker.
2. `src/pages/api/cards/[id]/marks.ts`: before the UPDATE, fetch
   `created_at, completed_at, cells`. If `completed_at` set and
   `areMarksLocked` → return **409**. Else write marks; if `completed_at` set,
   within grace, and the new marks are **not** a full card (`isFullCard`), set
   `completed_at = NULL` in the same UPDATE (invalidate).
3. `src/pages/index.astro` `toggleCell` (~622): if `card.completedAt` and locked
   → block + dry-humor toast. If within grace and the un-mark breaks the bingo →
   clear `card.completedAt`, hide the diploma button, drop back to the progress
   view, toast. Re-render grid disabled when locked.
4. `src/lib/api.ts` `syncMarks`: detect 409 → revert local marks and re-fetch.
5. `docs/domain/README.md`: rewrite "Once sung, a bingo stays sung" and the
   immunity line to the new grace/lock/retention rules.
6. Verify `/v/<id>` shows in-progress (not a diploma) when `completed_at` is NULL.

**Verify:** complete a card in dev; un-mark within grace → diploma gone, OG 404;
simulate >24h (set an old `completed_at` in local D1) → grid locked, forged POST → 409.

## P5 — Feature A: 12-month retention GC

1. `src/lib/card.ts` (or `groups.ts`): a helper expressing "completed older than
   12 months" for the GC.
2. `src/pages/api/cards/index.ts` GC batch (~60): add a sweep deleting completed
   cards with `datetime(completed_at) < datetime('now','-12 months')`. Grouped
   ones must settle: select grouped expired-completed ids, `DELETE … RETURNING
   group_id`, `settleDeparture` each; bulk-delete the ungrouped; keep
   `orphanedOwnerRepair` as backstop. Mirror in `groups/index.ts` if cheap.
3. `docs/domain/README.md`: document the 12-month completed-card retention.

**Verify:** insert a completed card with an old `completed_at` (and a grouped one)
into local D1, issue a card to trigger GC, confirm deletion + settled group.

## P6 — Feature B: Turnstile

1. `src/lib/turnstile.ts`: `verifyTurnstile(token, ip)` → POST to
   `https://challenges.cloudflare.com/turnstile/v0/siteverify` with
   `env.TURNSTILE_SECRET_KEY`; fail closed on missing/invalid.
2. Gate `POST /api/cards`, `/api/recover`, `/api/groups`,
   `/api/groups/[id]/join`: read `cf-turnstile-response`, verify, 403 on failure.
3. Client: render the Turnstile widget in the relevant flows
   (`index.astro` issue/recover, `g/[id].astro` create/join); attach the token in
   `api.ts` (`registerCard`, `requestRecovery`, `createGroup`, `joinGroup`).
4. `wrangler.jsonc`: add Turnstile **site key** as a public `var`. Secret via
   `npx wrangler secret put TURNSTILE_SECRET_KEY` (+ `.dev.vars` locally).
5. `src/pages/privacidad.astro` + `docs/legal/README.md`: disclose Turnstile
   (Cloudflare processor, cookieless, no data stored).

**Verify:** the 4 endpoints reject a missing/garbage token; the happy path still
works with a valid widget token in dev.

## P7 — Feature B: rate-limiting

1. `wrangler.jsonc`: add the Workers **Rate Limiting binding** (native, no KV).
2. `src/lib/rate-limit.ts`: wrapper keyed by `cf-connecting-ip` (+ action);
   returns allow/deny; degrades open if the binding is absent in dev.
3. Apply the check at the top of every write endpoint; 429 on exceed, tighter
   limits on issue/recover/create.
4. `src/lib/api.ts`: surface 429 without breaking the offline-first degradation.
5. `docs/infrastructure/README.md`: document the WAF rate-limit rules (dashboard).

**Verify:** loop a write past the limit → 429; normal play never trips it.

## P8 — PR

One PR to `main`. Companion reviews per CLAUDE.md (design, brand, web-perf, SEO,
**security**, a11y). Flip the roadmap row to `done`.

## Sequencing / risk

- P1 de-risked P2/P3 (done). P4 before P5 (lifecycle rule before its GC). P6
  before P7 (Turnstile is the high-value gate; rate-limit is the broad net).
- **Risk — A client/server drift:** the server is authoritative; the client UI
  must mirror lock/invalidation and handle 409. Test both paths.
- **Risk — B fail-closed:** missing Turnstile secret/binding must not 500 the
  whole site; gated endpoints fail closed (reject) but the offline-first game
  keeps working. Set secrets before deploy.
- **Risk — Turnstile UX friction:** keep it off the high-frequency sync paths
  (decision recorded); only the 4 creation/email endpoints.
