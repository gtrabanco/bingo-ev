# Accessibility

## Standard

Target **WCAG 2.1 AA** for user-facing changes. There is **no automated a11y check** in
CI (no test suite); accessibility is verified manually during review. Treat this as the
baseline checklist, not a guarantee — gaps that aren't yet covered should be filed as
issues rather than assumed handled.

## Checklist (every user-facing change)

- **Semantics**: real elements — cells are `<button>`s with `aria-pressed` reflecting the
  mark state; blanks are `aria-hidden`. Status lines use `aria-live="polite"`. Keep this.
- **Keyboard**: every interactive control reachable and operable by keyboard; the cartón
  buttons, mark-mode toggle, dialogs, group actions included. The certificate is a native
  `<dialog>` (focus trap + Esc for free) — prefer it over ad-hoc modals.
- **Contrast**: the paper/ink/felt palette must keep text ≥ AA contrast; check new color
  pairings against the tokens in `global.css`.
- **Focus**: visible focus states; don't remove outlines without a replacement.
- **Screen reader**: meaningful labels for icon-only/short controls (e.g. the per-member
  "echar" button — known gap: it lacks a per-member accessible name; tracked, not yet
  fixed). Toasts/`aria-live` announce wins and errors.
- **Motion**: dauber animation is gated behind `prefers-reduced-motion: no-preference`.

## Known gaps

- Kick "echar" buttons share a generic accessible name (no per-member label). File before
  relying on it being fixed.

## Font and nav contrast notes (feature 14)

The new top-nav (`.nav-action`) renders text at two small sizes:
- **10px uppercase labels** (`.nav-label`) in `paper-300/70` on `felt-900` → verify
  ≥ 3:1 (large-text threshold at 18pt bold / 14pt bold; 10px uppercase doesn't qualify
  as large, so target **4.5:1** for normal-text AA).
- **Space Mono serials** (11–12px monospaced code labels on the card header) → verify
  ≥ 4.5:1 against the cartón background.

The "Borrar todo" link already uses `text-red-300/80` (4.61:1 on felt-900, passes AA)
— do not regress this when restyling the nav.
