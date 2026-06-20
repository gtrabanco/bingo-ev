# Design / visual system

## Principles

A **bingo-hall parody** aesthetic: green felt table, paper cartón, red dauber ink. It
should feel playful and tactile, dry-humored, never edgy or polished-corporate.
Mobile-first; the cartón is the hero.

## Typography

Three self-hosted woff2 faces (no Google Fonts request; all SIL OFL 1.1, files in
`public/fonts/`; converted offline with `woff2_compress`):

| Face | Role | CSS family | Tailwind utility |
|---|---|---|---|
| Bricolage Grotesque (variable, wt 400–800) | Display + UI — body default via preflight | `font-sans` | `font-sans` |
| Lora (variable, wt 400–700 + italic) | Diploma voice, editorial headings | `font-serif` | `font-serif` |
| Space Mono (static 400/700) | Serials, codes, monospaced labels | `font-mono` | `font-mono` |

The `@theme` in `global.css` registers `--font-sans/serif/mono`; Tailwind's preflight
sets Bricolage Grotesque as the default body font site-wide. A metric-tuned fallback
`@font-face` (`Bricolage Grotesque Fallback`, base Arial) is included in `--font-sans`
to minimise CLS while the variable file loads.

Preload for Bricolage is in `Layout.astro` `<head>` (`rel=preload as=font crossorigin`).

## Tokens

Theme tokens live in `src/styles/global.css` under Tailwind 4's `@theme` block — use
them, never hardcode hex:

- Felt: `--color-felt-950/900/800` · Paper: `--color-paper-50/100/300` ·
  Dauber ink: `--color-dauber-600/700` · `--color-ink-900`.
- Amber accents use Tailwind's built-in `amber-300` family.

Cell, dauber blob, expired-stamp and the mark-mode toggle styles are component classes
in the same file (`.cell`, `.dab`, `.cell-in-line`, `.cell-blank`, `.expired-stamp`,
`.mode-btn`). Reuse them rather than re-styling inline.

## Card geometry (critical)

The cartón is **canonical landscape 3×4** in the DOM (row-major). Portrait renders the
**transpose with CSS only**: `grid-flow-col grid-cols-3 grid-rows-4`, flipped back under
Tailwind's `landscape:` variant (`landscape:grid-flow-row landscape:grid-cols-4
landscape:grid-rows-3`). This is an orientation media query, not a width breakpoint — so
rotating a phone rotates the cartón. The same classes appear in `BingoCard.astro` and
`c/[id].astro`. `global.css` shrinks cells on landscape viewports under 480px tall (phone
held sideways). **Never change win logic to match the displayed grid** — see
`docs/domain/README.md`.

## Layout

- Mobile: single column. Desktop (`lg:`): two columns — cartón left, paperwork (save,
  groups) right; both `<details>` panels auto-open at ≥1024px (set before any network
  await, so no collapsed-bars flash).
- The Tesla referral CTA sits **outside** the two columns, centered and capped at card
  width (`max-w-md`) as the footer's hat.

## Components & patterns

- `src/components/BingoCard.astro` — the cartón frame (header strip, grid, footer,
  expired stamp). Cells are injected client-side (each visitor's card differs).
- `src/components/CertificateModal.astro` — `<dialog>` with canvas preview, PNG download,
  verify link and share buttons. In-dialog feedback uses the `#share-hint` line (toasts
  are invisible over an open `<dialog>` in the top layer).
- Certificate/OG rendering: `src/lib/certificate.ts`, `src/lib/og-image.ts`,
  `src/pages/og/*`. Confetti: `src/lib/confetti.ts`.
