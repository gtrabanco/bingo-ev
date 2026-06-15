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

`M` — two independent render paths (canvas + OG SVG), a design pass, and manual
visual verification at multiple sizes. Not splittable into shippable slices
(parity is the point), so it stays one feature, executed in phases.

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

## Phases

- **P0 — Planning.** Produce `PLAN.md` + `TASKS.md` from this SPEC. (this skill)
- **P1 — Shared design module.** Extract `PALETTE` + `HONORIFICS` + shared copy
  into one module; repoint `certificate.ts` to it (no visual change yet). Gate.
- **P2 — Final PNG design.** Elevate `drawCertificate`. Visual-verify all three
  honorifics. Gate.
- **P3 — OG parity.** Rebuild `diplomaSvg` to match; add honorific to the OG
  endpoint's data path; remove the Google-Fonts import. Visual-verify. Gate.
- **P4 — PR.** One PR to `main`, `Closes #<issue>`.

## Deploy & rollback

n/a beyond merging — no schema migration (the honorific is derived from existing
`marks`), no env/config change, no feature flag. Rollback = revert the PR; the
prior renderers are pure functions with the same signatures.

## Open questions / risks

- **Canvas vs SVG fidelity** — pixel-identical is impossible across the two
  engines; "same document, two sizes" is the bar, not pixel parity. RISK: low,
  accepted.
- **OG endpoint honorific derivation** — must read `marks` and reuse
  `honorificFor`; confirm the column is selected. DEFERRED to P3 task.
- **System serif consistency** — canvas uses `Georgia, "Times New Roman", serif`;
  the OG SVG must use the same stack so crawlers that have Georgia match. Accepted.

## Deliverables

- `src/lib/certificate-design.ts` (shared tokens/copy) — new.
- `src/lib/certificate.ts` — final PNG design, consuming the shared module.
- `src/lib/og-image.ts` — `diplomaSvg` rebuilt for parity, Google-Fonts import
  removed.
- `src/pages/og/diploma/[id].svg.ts` — passes the derived honorific.
- This SPEC + `PLAN.md` + `TASKS.md`; roadmap row flipped to `in-progress` then
  `done`.

## Post-merge next feature

`02 photo-upload-collage` or `03 public-gallery` (03 depends on this one) — see
`docs/features/ROADMAP.md`.
