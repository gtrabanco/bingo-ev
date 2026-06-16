# 01 — final-certificate-design

> Feature specification. The doc read at the start of the workflow.

## Goal

Replace the placeholder diploma with its final, shippable design, and bring the
two places the diploma is rendered into visual parity. The certificate is the
game's most shared artifact (it carries the verify QR, the honorific and the
brand), so it must look finished and identical whether a player downloads the PNG
or someone sees the link-preview card. Today both renderers are explicitly marked
as stubs and they diverge.

## Branch

`feat/01-final-certificate-design`

## Size

`L` — originally `M` (the two render paths + design pass, phases P1–P3, now done).
**Expanded by owner decision on 2026-06-15** to also carry two behavioural
work-streams (see *Scope expansion* below): diploma lifecycle/integrity and abuse
prevention. Executed in phases, one commit per phase.

## Scope expansion (owner decision, 2026-06-15)

The owner explicitly chose to **bundle two further concerns into this branch/PR**
rather than ship them as separate roadmap features, with the trade-off surfaced
(this contradicts the project's "one PR per unit of work" convention and grows
the PR). Recorded in `decisions.md` so the PR audit treats it as deliberate, not
drift. The two added streams:

- **Feature A — Diploma lifecycle / integrity.** Un-marking a cell on an
  already-completed card invalidates the diploma within a 24 h grace (reverts to
  in-progress, recompletable) and is locked after 24 h; completed cards are
  retained 12 months instead of forever.
- **Feature B — Abuse prevention.** Cloudflare Turnstile on the resource-creating
  / email-sending endpoints + rate-limiting on all writes.

The original *technical* non-goals still hold: **no change to the `marks` wire
format, win detection, or honorific derivation**, and **no new npm dependency**
(Turnstile and the rate-limit binding are Cloudflare platform features, not
packages). What expands is only "design-only" → design + A + B.

## Dependencies

None hard. Soft: feature `03 public-gallery` depends on this (it surfaces these
certificates), so this should land before 03 starts — already reflected in the
roadmap dependency.

## Context

`src/lib/certificate.ts` draws the downloadable PNG on a `<canvas>` (1200×900):
aged-paper background, double green frame, `¡BINGO!`, nick on a ruled line, the
behaviour-derived honorific (`resignado` / `granujilla` / `sinverguenza`) with its
small print, completion date, verify URL and a `uqr` QR seal. Its own header
comment says "Final design still pending."

`src/lib/og-image.ts` (`diplomaSvg`) draws the link-preview card (1200×630) as a
**separate, simpler** SVG: no honorific, different proportions, a thinner single
frame. It also `@import`s Georgia from Google Fonts — which both violates the
no-webfonts rule and is a no-op (Georgia isn't served by Google Fonts), so the
preview silently falls back to a default serif.

The gap: the artifact a player downloads and the artifact their followers see in
the timeline are visibly different diplomas. For a feature whose whole value is
"presume de desgracia", that incoherence undercuts the share loop.

## Business goals

A finished, coherent, recognisable diploma maximises the share/virality loop
(the diploma + QR are the organic acquisition channel). Consistency between the
downloaded PNG and the link-preview builds trust that the verify link is real.

## Technical goals

- One canonical diploma design expressed in two renderers (canvas for the PNG,
  SVG for the OG card) that look like the same document at their two aspect
  ratios.
- Keep the renderers **pure and dependency-light**: canvas + `uqr` only, system
  fonts only, no new runtime deps, no webfonts.
- Centralise the shared design constants (palette, honorific copy/colour, layout
  metrics) so the two renderers can't drift again.

## Scope

### In scope

- Final visual design of the **downloadable PNG** (`certificate.ts`,
  `drawCertificate`), elevating the current aged-paper / green-frame / dauber-red
  aesthetic (per `docs/frontend/DESIGN.md`): stronger hierarchy, a proper
  "CADUCADO"-style stamp/seal language for the honorific, ornament/texture, and a
  crisper QR seal treatment.
- Final visual design of the **OG share card** (`og-image.ts`, `diplomaSvg`)
  matched to the PNG: same palette, same frame language, **now including the
  honorific**, at 1200×630.
- Remove the broken Google-Fonts `@import` from the OG SVG; use a system serif
  stack consistent with the canvas.
- Extract shared design tokens (palette hexes, honorific title/colour/line,
  key copy strings) into one module imported by both renderers.
- Keep all existing data inputs and outputs unchanged: `CertificateData`,
  `honorificFor`, `VERIFY_BASE_URL`, the PNG filename, the OG endpoint contract.

### Out of scope / non-goals

- The public gallery of certificates — owned by feature `03 public-gallery`.
- Photo upload / collage on the diploma — owned by feature `02`.
- Any change to win detection, honorific *derivation* logic, or the marks wire
  format (`src/lib/wins.ts`, `src/lib/card.ts`) — design only consumes the
  existing honorific.
- New share destinations or share copy — unchanged from current.
- Webfonts or any new runtime dependency — explicitly forbidden by project rules.
- The home OG image (`homeSvg`) — only the *diploma* OG card is in scope.

## Architecture impact

Lives entirely in the flat `src/lib` + `src/pages/og` layers, no new layer. Holds
these invariants from `docs/architecture/ARCHITECTURE.md`:

- **No new runtime dependency**; canvas + `uqr` only; **system fonts only** (this
  is *why* there are no webfonts — the OG `@import` removal aligns the code with
  the rule).
- The OG endpoint stays `prerender = false` and server env access stays via
  `import { env } from 'cloudflare:workers'` (unchanged — no edits to the
  endpoint's data path expected, only to the SVG string it returns).
- Renderers stay **pure** (no DOM/global state beyond the passed canvas), so the
  canvas one can run from the page script and the SVG one inside the Worker.
- UI strings remain Spanish (es-ES), dry-sarcastic, **no brand names**; code
  comments English (`docs/frontend/COPYWRITING.md`).

## Design

**Single source of truth.** New module `src/lib/certificate-design.ts` (name to
confirm in PLAN) exports the shared constants both renderers consume:

- `PALETTE` — paper, frame green, dauber red, ink, muted, honorific colours.
- `HONORIFICS: Record<Honorific, { title; color; line }>` — moved out of
  `certificate.ts` so the OG card uses the **same** honorific copy/colour.
- Shared copy: eyebrow ("CERTIFICADO OFICIOSO …"), the body certifying line, the
  legal-joke footer ("Sin validez legal, técnica ni emocional."), verify-label.

**Two renderers, one document.**

- Canvas (PNG, 1200×900, portraitish landscape): the full diploma. Elevation
  levers — double frame with corner ornaments, an embossed/curved honorific seal
  (reusing the rubber-stamp visual language already in the app's `.expired-stamp`
  vocabulary), ruled name line, QR as a sealed corner. Keep all current content
  rows; raise typographic hierarchy and spacing.
- OG SVG (1200×630, wide): a *compressed* version of the same document — same
  paper, same frame, `¡BINGO!`, nick, **honorific seal**, date, verify URL. No QR
  required at OG size (link itself is the action); decide in PLAN whether to
  include a small one. System serif stack, no `@import`.

**Honorific parity.** Both renderers import `HONORIFICS` from the shared module;
the OG card gains the honorific title + colour it currently lacks.

**Inputs unchanged.** `diplomaSvg` still takes `{ nick, date, cardId }`; to show
the honorific the OG endpoint must also pass the honorific. The card row already
stores `marks`; the endpoint will derive the honorific via the existing
`honorificFor` (read `marks`, compute) — a data-path addition to the endpoint, not
a schema change.

## Decisions to confirm

- **Scope = PNG + OG parity.** CONFIRMED (user, this session).
- **Direction = elevate the existing aged-paper/green-frame diploma**, not a new
  metaphor. CONFIRMED (user, this session).
- Exact name of the shared-constants module and whether the OG card carries a
  mini QR — defer to PLAN, low-risk.

## Acceptance criteria

- `npm run build` is green (the verification gate).
- Downloading the diploma yields a PNG that visibly reads as a *finished* diploma
  (not the stub), at 1200×900, with nick, correct honorific seal, date, verify
  URL and a crisp QR.
- The OG card at 1200×630 uses the **same palette, frame and honorific** as the
  PNG and shows the honorific title for the card's behaviour.
- The OG SVG contains **no** `fonts.googleapis.com` reference.
- `HONORIFICS` and the palette exist in exactly **one** module, imported by both
  renderers (no duplicated honorific table).
- All three honorific variants render correctly in both renderers.
- No new entry in `package.json` dependencies; no webfont; no brand name in any
  string.

**Feature A:**
- Un-marking a completed card **< 24 h** after completion clears `completed_at`
  server-side, hides the diploma, and the OG endpoint 404s for it.
- A marks change to a card completed **> 24 h** ago is rejected by the server
  (409) and the grid is disabled client-side.
- A completed card whose `completed_at` is **> 12 months** old is removed by the
  next opportunistic GC; if it was in a group, `settleDeparture` ran (no dangling
  `winner_card_id`/`owner_card_id`).
- The `marks` wire format, win detection and honorific derivation are **unchanged**.

**Feature B:**
- `POST /api/cards`, `/api/recover`, `/api/groups`, `/api/groups/[id]/join`
  reject requests with a missing/invalid Turnstile token.
- Writes past the per-IP limit return **429**; the client surfaces it without
  crashing the offline-first flow.
- `TURNSTILE_SECRET_KEY` is a `wrangler secret`, **never** in `wrangler.jsonc`.
- Turnstile is disclosed in `/privacidad`; it sets **no cookies**.
- No new npm dependency (Turnstile + rate-limit binding are platform features).

## Testing requirements

No automated suite exists (project has no tests/linter); verification is the
build gate + manual visual check. Required manual checks, all reproducible in
local dev:

- Render each honorific variant on the canvas and confirm the PNG downloads.
- Hit `/og/diploma/<id>.svg` for a completed card of each honorific and confirm
  the SVG renders with the matching seal.
- Confirm the OG card in a link-preview validator (or by eye at 1200×630) matches
  the PNG's look.

## Dev scenarios

| Scenario | Reproduces | Mechanism it drives |
|---|---|---|
| `cert:complete-resignado` | finished card, all suffered | complete a card with only single-tap marks → diploma dialog → download |
| `cert:complete-sinverguenza` | finished card, mostly caused | complete a card with ≥ half double-tap marks → honorific seal = Sinvergüenza |
| `cert:og-render` | link preview card | GET `/og/diploma/<id>.svg` for a completed card id |
| `cert:fallback-nick` | empty nick | complete without typing a nick → `FALLBACK_NICK` path in both renderers |
| `life:unmark-grace` | un-mark < 24 h | complete, then un-mark a cell → diploma void, card back to in-progress, OG 404s, recompletable |
| `life:unmark-locked` | un-mark > 24 h | completed > 24 h ago → grid disabled; a forged marks POST returns 409 |
| `life:retention` | 12-month sweep | a completed card with `completed_at` > 12 months is deleted on the next GC; grouped one settles departure |
| `abuse:turnstile` | bot issue/recover | `POST /api/cards` or `/api/recover` without a valid Turnstile token → rejected |
| `abuse:ratelimit` | flood | repeated writes from one IP past the limit → 429 |

## Feature A — Diploma lifecycle / integrity

**Rule (replaces "a bingo sung stays sung").** A completed card stays valid only
while its marks are not walked back. The **server clock is authoritative**:

- **Within 24 h of `completed_at`** — removing a mark so the card is no longer a
  full card **invalidates** the diploma: `completed_at` is set back to `NULL`, the
  card reverts to in-progress and is recompletable. The verify page (`/v/<id>`)
  and the OG endpoint already treat `completed_at IS NULL` as "not completed"
  (OG 404s), so invalidation is mostly a matter of clearing the column and
  updating client UI.
- **After 24 h** — the marks are **locked**: the server rejects any marks change
  to a completed card (HTTP 409) and the client disables the grid.
- **Retention** — completed cards are deleted **12 months** after `completed_at`
  (was: immune forever). The opportunistic GC gains a second sweep; grouped cards
  deleted this way must run `settleDeparture` (and `orphanedOwnerRepair` is the
  backstop).

**Touch points (from code map):**
- `src/lib/card.ts` — add `MARKS_LOCK_HOURS = 24`, `marksLockAt(completedAt)`,
  `areMarksLocked(completedAt, now)`. No wire-format change.
- `src/pages/api/cards/[id]/marks.ts:29` — fetch `completed_at` + `cells`; if
  completed & locked → 409; if completed & within grace & resulting marks not a
  full card → also set `completed_at = NULL` in the UPDATE.
- `src/pages/index.astro:622` (`toggleCell`) — block toggles when locked (toast);
  on within-grace un-mark that breaks the bingo, clear `completedAt` locally, hide
  the diploma button, return to the "cómo va" view.
- `src/lib/api.ts:65` (`syncMarks`) — surface 409 so the client can revert + reload.
- GC: `src/pages/api/cards/index.ts:60` batch (+ mirror in `groups/index.ts:74`);
  helper in `src/lib/groups.ts`; settle grouped deletions.
- `docs/domain/README.md` — rewrite the "Once sung, a bingo stays sung" rule and
  the expiry/immunity lines.

**No migration** — `completed_at` already exists; lock/retention are derived.

## Feature B — Abuse prevention

**Turnstile** (anti-bot, cookieless) gates only the endpoints that create
resources or send email **without requiring a pre-existing owned card** — because
Turnstile tokens are single-use and short-lived, so they cannot gate the
high-frequency, owner-secret-authorized syncs:

- Turnstile-gated: `POST /api/cards` (issue — primary bloat vector),
  `POST /api/recover` (email), `POST /api/groups` (create),
  `POST /api/groups/[id]/join`.
- Rate-limit only (already require the owner secret): marks, complete, alias,
  email-link, leave, kick, group-delete, card-delete.

**Rate-limit** every write by IP (`cf-connecting-ip`), tighter on issue/recover/
create, via the Cloudflare **Workers Rate Limiting binding** (native, configured
in `wrangler.jsonc`, no KV, no npm dep). Cloudflare **WAF** rate-limit rules are
the coarse edge layer (dashboard config, documented in `docs/infrastructure`).

**Touch points (from code map):**
- New `src/lib/turnstile.ts` (server-side siteverify) and `src/lib/rate-limit.ts`
  (binding wrapper reading `cf-connecting-ip`).
- The 4 gated endpoints call `verifyTurnstile`; all write endpoints call the
  rate-limit check first (429 on exceed).
- `src/lib/api.ts` — attach the `cf-turnstile-response` token on the 4 gated
  client calls (`registerCard`, `requestRecovery`, `createGroup`, `joinGroup`);
  handle 429.
- Turnstile widget in the relevant client flows in `src/pages/index.astro` /
  `src/pages/g/[id].astro`.
- `wrangler.jsonc` — add the rate-limit binding + the Turnstile **site key** as a
  public `var`; the **secret** via `npx wrangler secret put TURNSTILE_SECRET_KEY`
  (never in `wrangler.jsonc`, same pattern as `BREVO_API_KEY`).
- `src/pages/privacidad.astro` + `docs/legal/README.md` — disclose Turnstile
  (Cloudflare processor, cookieless, no data stored).

## Phases

- **P0 — Planning.** Produce `PLAN.md` + `TASKS.md` from this SPEC. (done)
- **P1 — Shared design module.** (done)
- **P2 — Final PNG design.** (done)
- **P3 — OG parity.** (done; P2 review fixes folded in)
- **P4 — Feature A: unmark invalidation + lock.** Server enforce + client UI +
  `card.ts` helpers + `docs/domain` rewrite. Gate + manual verify.
- **P5 — Feature A: 12-month retention GC.** Add the completed-card sweep with
  `settleDeparture` integration. Gate.
- **P6 — Feature B: Turnstile.** `turnstile.ts`, verify on the 4 gated endpoints,
  client widget + token, `wrangler.jsonc` site key + secret, privacy/legal docs.
  Gate.
- **P7 — Feature B: rate-limiting.** Rate-limit binding + `rate-limit.ts`, apply
  to all writes, 429 handling, WAF rules documented. Gate.
- **P8 — PR.** One PR to `main`. Companion reviews (design, brand, web-perf, SEO,
  security, a11y). Flip roadmap row `01` to `done`.

Review checkpoints: after P4+P5, after P6+P7, and before P8 (per `execute-phase`).

## Deploy & rollback

- **Design (P1–P3):** no migration, no env change. Rollback = revert.
- **Feature A (P4–P5):** no migration (`completed_at` reused). Pure logic +
  GC sweep; rollback = revert.
- **Feature B (P6–P7):** requires a new secret `TURNSTILE_SECRET_KEY`
  (`wrangler secret put`), a Turnstile **site key** public var, and the
  rate-limit binding in `wrangler.jsonc` — set these **before** deploy or the
  gated endpoints fail closed. WAF rules are dashboard config. Rollback = revert
  the PR; the secret/binding can stay (unused).

## Open questions / risks

- **Canvas vs SVG fidelity** — pixel-identical is impossible across the two
  engines; "same document, two sizes" is the bar, not pixel parity. RISK: low,
  accepted.
- **OG endpoint honorific derivation** — must read `marks` and reuse
  `honorificFor`; confirm the column is selected. DEFERRED to P3 task.
- **System serif consistency** — canvas uses `Georgia, "Times New Roman", serif`;
  the OG SVG must use the same stack so crawlers that have Georgia match. Accepted.

## Deliverables

**Design (P1–P3, done):**
- `src/lib/certificate-design.ts` (shared tokens/copy) — new.
- `src/lib/certificate.ts` — final PNG design, consuming the shared module.
- `src/lib/og-image.ts` — `diplomaSvg` rebuilt for parity, Google-Fonts import
  removed.
- `src/pages/og/diploma/[id].svg.ts` — passes the derived honorific.

**Feature A (P4–P5):**
- `src/lib/card.ts` — lock/grace helpers.
- `src/pages/api/cards/[id]/marks.ts` — server enforces invalidate/lock.
- `src/pages/index.astro` — client lock/invalidate UX.
- `src/lib/api.ts` — 409 handling on `syncMarks`.
- GC sweep in `src/pages/api/cards/index.ts` (+ `groups/index.ts`), helper in
  `src/lib/groups.ts`.
- `docs/domain/README.md` — rewritten lifecycle rules.

**Feature B (P6–P7):**
- `src/lib/turnstile.ts`, `src/lib/rate-limit.ts` — new.
- The 4 gated endpoints + all write endpoints (rate-limit).
- `src/lib/api.ts` — token attach + 429 handling.
- `wrangler.jsonc` — rate-limit binding + Turnstile site-key var; secret via CLI.
- `src/pages/privacidad.astro`, `docs/legal/README.md`, `docs/infrastructure` —
  disclosures + WAF config.

**Planning:** this SPEC + `PLAN.md` + `TASKS.md` + `decisions.md`; roadmap row
`01` flipped `in-progress` → `done`.

## Post-merge next feature

`02 photo-upload-collage` or `03 public-gallery` (03 depends on this one) — see
`docs/features/ROADMAP.md`.
