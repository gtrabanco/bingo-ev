# fix/67-og-title-length

## Goal

The homepage title is 88 characters; link-preview cards (X, Facebook, WhatsApp,
LinkedIn) and Google SERPs truncate titles around 60 characters, so the tail
("…del cargador EV en España") is cut off everywhere it is displayed. This is the
text counterpart to feature 16's share images: the image now renders, but the
title above it is clipped. Shorten the title to ≤ 60 characters.

## Issue

`#67` — tracked issue. The PR closes it.

## Branch

`fix/67-og-title-length`

## Root cause

`src/pages/index.astro:16` sets a single `title` prop of 88 characters:

> El Bingo del Cargador — Juego de bingo online sobre desgracias del cargador EV en España

That one prop feeds `<title>`, `og:title` and `twitter:title`
(`src/layouts/Layout.astro:36,47,56`). At 88 chars it exceeds the ~60-char limit
that link-preview crawlers and SERPs display, so the brand reads fine but the
descriptive tail is always truncated.

## Scope

### In scope

Replace the `title` prop value in `src/pages/index.astro:16` with a ≤ 60-char
title that preserves the brand, the strongest keywords, and the dry tone:

> El Bingo del Cargador — desgracias de la carga en España  (56 chars)

No new prop: the shared `title` already serves `<title>` / `og:title` /
`twitter:title`, and ≤ 60 is also the right length for the SEO `<title>`. The
long-tail keywords (gratis, eléctrico, recarga pública, diploma) remain in the
`description` meta, which is unchanged.

### Out of scope

- The `description` meta length (~165 chars; descriptions truncate ~155–160). Not
  this issue — file separately if it bothers anyone.
- A separate `ogTitle` prop to decouple `<title>` from `og:title`. Unnecessary —
  both want ≤ 60; decoupling adds surface for no benefit.

## Impact

- Files touched: `src/pages/index.astro` (one line).
- Blast radius: purely the homepage title/meta text. No behaviour, no schema, no
  identity, no routing. A wrong value would only show a different title string.
- Detection lead time: immediate — visible in view-source and any link-preview
  validator on the next deploy.

## Rules that must never be violated

- UI strings in Spanish (es-ES), dry-sarcastic tone, **no brand names**.
- Flat architecture; no new dependency. (Neither is touched.)

## Risks

- Operational: n/a (static string change).
- Security: n/a (no input, no logic).
- Compliance: n/a.
- SEO: minor — the title drops "Juego de bingo online" and "EV"; both are implied
  ("cargador") and the description retains the rest. Net positive: the title now
  displays in full in SERPs and previews instead of being truncated.

## Acceptance criteria

- [ ] Homepage `<title>` / `og:title` / `twitter:title` ≤ 60 characters (verify in
      view-source). — manual / build
- [ ] Brand "El Bingo del Cargador" preserved; dry tone; no brand names. — review
- [ ] `npm run build` green. — gate

## Rollback

Revert the one-line change (or the PR). No data-side cleanup.

## Effort

XS — a single-line copy change with no behavioural surface.
