# 14 — decisions

Decisions taken at planning. Owner decisions are marked; the rest are engineering
calls grounded in the discovery, recorded so a later audit doesn't "fix" them back out.

## D1 — Self-hosted webfonts vs the "no webfonts" convention

**Decided: allowed; amend the convention text, not the rule.** CLAUDE.md L65 forbids
**new runtime dependencies** "(this is why there are no webfonts)". The new fonts are
**self-hosted static assets** in `public/fonts/` — no npm package, no third-party
(Google Fonts) request, EU-privacy preserved. So the runtime-dep rule is **not**
violated. S1 rewrites the parenthetical to permit self-hosted static fonts while still
barring Google Fonts / a font npm package / a build-time subsetter-as-runtime-dep; and
rewrites `DESIGN.md` L8 ("Avoid webfonts").
**Why:** leaving the text as-is makes it contradict shipped reality and invites a
future audit to delete the fonts. **How to apply:** doc fix bundled **into S1** so the
convention never lags the code.

## D2 — Scope: whole site in feature 14 *(owner decision)*

**Decided: everything.** Feature 14 covers foundation + home + **all 9 secondary
pages** + the diploma/OG render path — not foundation-only. Asked explicitly; owner
chose "todo en feature 14".
**Why:** the owner wants a single coherent redesign, not a long inheritance tail.
**How to apply:** the long tail (S5 bespoke pages, S8 OG) is split into sub-PRs to keep
each increment small and honor never-stack; the **feature's** definition of done is the
whole site, but each **PR** stays independently shippable.

## D3 — Diploma + OG adopt real fonts now *(owner decision)*

**Decided: both.** The downloadable PNG (canvas, S7) and the OG/social SVG images (S8)
both render Lora/Space Mono — not just the on-page modal (which inherits Lora free).
Asked explicitly; owner chose "ambos ahora".
**Why:** the shareable artifacts are the brand's most-seen surface; the owner wants them
on-voice. **How to apply:** canvas first (cheap, `document.fonts` gate), OG second
(subset-embed, the expensive part) — never change the shared `certificate-design.ts`
constant until **both** surfaces resolve the font, or OG renders a font it can't fetch.
See D8 for the no-deps mechanism. Fallback path if OG proves too costly:
`known-issues.md`.

## D4 — Include the cartón-protagonist home restructure *(owner decision)*

**Decided: yes, as S4.** Remove the giant H1 (brand now lives in SiteNav), single
centered column, card as the visual lead. Owner chose "incluir (slice 4)".
**Why:** the package moved the brand to the nav *specifically because* the
cartón-protagonist layout removes the H1; shipping the nav without S4 leaves a redundant
H1. Cheap, layout-only, one page, independently shippable after S3.

## D5 — Extract a shared `<CardFrame>` component

**Decided: extract it (S5a).** The cartón frame is currently hand-duplicated in
`BingoCard.astro` + `c/[id]` + `v/[id]` + `g/[id]` (and a JS-string twin in `g`). Rather
than re-skin four copies and keep them in sync forever, S5a extracts one
`<CardFrame>` that all consume.
**Why:** mirrors the project's DRY instinct (cf. the `clearCurrentCard()` storage
refactor); makes the next card change one edit, not four. **How to apply:** extract from
the redesigned cartón, refit `index.astro` first (hooks preserved), then the three
pages. Engineering call, not owner-gated.

## D6 — Keep amber as the accent (no token migration)

**Decided: keep `amber-300`.** The redesign does **not** move the accent off amber, so
the cross-cutting "accent sweep" risk is moot and no `@theme` accent token is introduced
in this feature.
**Why:** scope control — an accent change would force a fragile repo-wide find/replace
across 9 pages **and** JS-generated markup, for no design requirement. Promoting amber to
a token is recorded as out-of-scope in `known-issues.md`. **How to apply:** if a future
design wants a different accent, do the token promotion first, then the sweep.

## D7 — Mount SiteNav site-wide via Layout, prop-gated

**Decided: mount in `Layout.astro` with an opt-out prop (S6).** Rather than copy SiteNav
into nine pages, mount it once in the shared shell; pages that want a minimal shell
(pure share/OG-target views, if any) pass `nav={false}`.
**Why:** one source of truth for the global header; consistent shell across the whole
site (the point of D2). **How to apply:** finalize the opt-out list during S6 execution
by eyeballing each page — `c/[id]`/`v/[id]` are share targets and may warrant a lighter
header; default is `nav={true}`. This is the one decision deliberately left to confirm at
execution (low risk, reversible).

## D8 — Font conversion + subsetting are offline/dev steps, never a runtime dep

**Decided: offline, committed assets.** TTF→woff2 (S1) and the Lora/Space Mono Latin
subset for OG (S8) are produced by local/dev tooling (e.g. `fonttools`/`woff2`) and the
**outputs** are committed to `public/fonts/` (and the OG subset asset). No conversion or
subsetting tool enters `package.json` as a runtime dependency.
**Why:** honors the hard no-new-runtime-deps convention while still getting woff2's size
win and a real-font OG. **How to apply:** document the exact offline command in the S1/S8
commit body so the step is reproducible; the repo only ever ships the generated binary +
its OFL license.

## D9 — No `Closes #14`; feature# ≠ issue#

**Decided: no auto-close link.** GitHub issue #14 is an **unrelated** a11y ticket
("profile control success state not announced"). This project assigns **feature numbers**
independently of issue numbers (features 01–13 don't map to issue numbers). Feature 14's
PRs must **not** carry `Closes #14`.
**Why:** prevents accidentally closing an unrelated open issue on merge. **How to apply:**
PR bodies reference the feature/slice, not issue #14.

## D10 — Delivery: one feature branch, phased commits, single PR after S8 *(revises D2's "one PR each")*

**Decided: one branch `feat/14-design-refactor-design-system`, one gate-green commit per
slice (S1, S2, …), and a single feature PR opened after the final slice — not 8 separate
PRs.** The SPEC/decisions/roadmap originally framed the 8 slices as "one PR each, never
stacked". In execution that proved impossible to honor *as written*: the dependency chain
(S3→S1, S4→S3, S5→S1, S6→S1+S3, S7→S1, S8→S1+S7) means per-slice PRs against `main` would
either **stack** (forbidden by the project's hard rule) or require **merging each slice to
`main` before starting the next** — a cadence the owner did not choose (slices are being
run back-to-back without intervening merges).
**Why:** the never-stack rule and the dependency chain leave a single phased branch as the
only coherent option under the chosen cadence. Each per-slice commit is still
**independently reviewable and gate-green** (the substance of "independently shippable"),
so nothing is lost but the PR-per-slice ceremony.
**How to apply:** review cadence is the execute-phase default — `/review-change` every 2
slices and once more before the PR. The single PR (after S8) carries no `Closes #14` (D9).
If the owner later wants per-slice PRs, the path is: merge S1 to `main`, branch S2 from
`main`, repeat — but that trades the cohesive-redesign goal (D2) for more merge overhead.
Revises the **delivery** half of D2; D2's **scope** decision (whole site in feature 14) is
unchanged.
