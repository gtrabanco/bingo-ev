# fix/69-og-brand-meta

## Goal

Two brand-representation gaps in the homepage head: `og:site_name` is missing
(standard OG property that names the site above link-preview cards), and there is
no `Organization` logo in the structured data, so Google has no brand logo to show
in the knowledge panel / brand results. Both are cheap, standard, and use the logo
the project already ships. (`og:logo`, which a generic meta-tag validator flags, is
**not** a real Open Graph property and is ignored by every crawler — not added.)

## Issue

`#69` — tracked issue. The PR closes it.

## Branch

`fix/69-og-brand-meta`

## Root cause

- `src/layouts/Layout.astro:36-44` declares the OG block but never emits
  `og:site_name`, so previews fall back to the bare domain for the site label.
- `src/layouts/Layout.astro:67` ships JSON-LD typed `WebApplication` with a `Person`
  creator but **no `Organization` and no `logo`**. Google's logo rich result reads a
  logo only from an `Organization` node, so there is nothing for it to pick up.
- **Discovered during implementation — pre-existing invalid-JSON bug:** the block was
  hand-written with **double braces** (`{{ … }}`). Inside `<script type="application/
  ld+json">` Astro treats the content as raw text and does **not** process `{}`, so
  the literal `{{`/`}}` were emitted to the HTML — the rendered structured data was
  **invalid JSON and rejected wholesale by crawlers** (verified against the dev-server
  rendered HTML). A valid `Organization`/`logo` cannot be added without fixing this,
  so the brace bug is fixed here (it is the same block and a hard prerequisite for the
  logo acceptance criterion). Fixed root-and-branch by emitting the JSON-LD via
  `is:inline set:html={JSON.stringify({…})}` — a real object serialized at build time,
  which makes a brace typo structurally impossible going forward.

## Scope

### In scope

`src/layouts/Layout.astro` only:

1. Add `<meta property="og:site_name" content="El Bingo del Cargador" />` to the OG block.
2. Restructure the existing JSON-LD into an `@graph` with:
   - a standalone `Organization` (`@id` `…/#org`, `name`, `url`, `logo` →
     `https://bingo.gruxon.com/favicon.svg`), and
   - the existing `WebApplication` unchanged except for a `publisher` reference to
     the Organization `@id`.
   All existing WebApplication fields (name, description, offer, aggregateRating,
   creator, etc.) are preserved verbatim.
3. Emit the block via `is:inline set:html={JSON.stringify({…})}` instead of
   hand-written braces — this fixes the pre-existing invalid-JSON double-brace bug
   (see Root cause) and prevents its recurrence.

Logo asset: reuse the existing `public/favicon.svg` (the bingo-ball brand mark,
square, already served at `/favicon.svg`). **No new asset, no design work.**

### Out of scope

- A raster (PNG) logo variant. `favicon.svg` is a valid structured-data image and is
  what the project ships; revisit only if Google rejects the SVG logo in testing.
- The unused `src/assets/bingo-ev-header.png` banner — not a logo; leave as-is.
- Homepage title length — separate fix (`67-og-title-length`, PR #68).

## Impact

- Files touched: `src/layouts/Layout.astro` (head meta + one JSON-LD block).
- Blast radius: head metadata only — no behaviour, schema, identity, or routing.
  A malformed JSON-LD would fail the Rich Results Test but not break the page.
- Detection lead time: immediate — visible in view-source / Rich Results Test on the
  next deploy.

## Rules that must never be violated

- UI strings in Spanish (es-ES), dry tone, **no brand names**. (The site name and
  logo are the project's own brand — allowed; the no-brand rule is about third-party
  charger/car brands.)
- Flat architecture; no new dependency; `import { env } from 'cloudflare:workers'`
  not relevant here (no server env access).

## Risks

- Operational: n/a (static head markup).
- Security: n/a (no input, no logic).
- Compliance: n/a.
- SEO: positive — adds a valid `Organization`/logo and `og:site_name`; risk is only
  that Google may prefer a raster logo (mitigated: SVG is a supported structured-data
  format; revisit if testing shows otherwise).

## Acceptance criteria

- [ ] `og:site_name` present and = "El Bingo del Cargador" (view-source). — manual
- [ ] JSON-LD is an `@graph` containing an `Organization` whose `logo` =
      `https://bingo.gruxon.com/favicon.svg`, and the `WebApplication` references it
      as `publisher`. — manual / Rich Results Test
- [ ] All prior WebApplication fields preserved (name, description, url,
      applicationCategory, offer, aggregateRating, creator). — review
- [ ] Rendered JSON-LD is **valid JSON** (the prior `{{ }}` double-brace output is
      gone) — `JSON.parse` of the script body succeeds. — manual
- [ ] `npm run build` green. — gate

## Rollback

Revert the one-file change (or the PR). No data-side cleanup.

## Effort

XS — head-meta additions in a single file, reusing an existing asset.
