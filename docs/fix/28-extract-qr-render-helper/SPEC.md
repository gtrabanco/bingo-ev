# fix/28-extract-qr-render-helper

## Goal

`renderDeviceCodeQr` in `src/pages/index.astro:1935` and `renderReceiveQr` in
`src/pages/activar.astro:219` are near-verbatim copies of the same SVG cell-loop
logic (same `scale=5`, `ecc:'M'`, `border:2`, identical SVG output). Extract the
shared rendering logic into `src/lib/qr.ts` so that any future change to QR
styling (scale, error-correction, border, CSS class) only needs to happen in one
place.

## Issue

`#28`

## Branch

`fix/28-extract-qr-render-helper`

## Root cause

The QR rendering logic was written twice — once in `index.astro` (device-code
transfer flow) and once in `activar.astro` (receive-slot flow) — with no shared
helper. The only caller-specific parts are the element reference and the URL.

## Scope

### In scope

- **`src/lib/qr.ts`** (new file): export `renderQrInto(el: HTMLElement, url: string): void`.
  It owns the `uqr` encode call and the SVG cell-loop; callers supply the element
  and pre-built URL.
- **`src/pages/index.astro`**: replace `renderDeviceCodeQr`'s inner body with a
  call to `renderQrInto`; remove the now-redundant `import { encode as encodeQr } from 'uqr'`.
- **`src/pages/activar.astro`**: same refactor for `renderReceiveQr`.

### Out of scope

- No behavior change. QR output must be byte-for-byte identical before and after.
- No changes to the URLs passed to the encoder, the DOM element IDs, or the surrounding
  flow logic.

## Impact

- Files touched: `src/lib/qr.ts` (new), `src/pages/index.astro`, `src/pages/activar.astro`.
- Blast radius: QR display in both the device-code panel (index) and the receive-slot
  panel (activar). A wrong change would break QR rendering in those two flows only.
- Detection: visual — the QR fails to render or renders incorrectly in the browser.

## Rules that must never be violated

- No new runtime dependencies (already honoured — `uqr` is approved).
- Flat architecture: new file goes in `src/lib/`, not a new subdirectory.
- No code comments except for non-obvious WHY.
- `src/lib/qr.ts` must not import from pages or components (inner layer rule).

## Risks

- Security: n/a.
- Compliance: n/a.
- Behavior regression: the SVG output must remain identical — same `scale`, `ecc`,
  `border`, CSS class (`text-paper-50`), and SVG structure.

## Acceptance criteria

- [ ] `src/lib/qr.ts` exists and exports `renderQrInto(el: HTMLElement, url: string): void`.
- [ ] `index.astro` no longer contains the SVG cell-loop; imports `renderQrInto`
  from `../lib/qr`; removes the local `uqr` import.
- [ ] `activar.astro` no longer contains the SVG cell-loop; imports `renderQrInto`
  from `../lib/qr`; removes the local `uqr` import.
- [ ] QR output is identical (same constants: `scale=5`, `ecc:'M'`, `border:2`,
  class `text-paper-50`).
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — no data-side impact; purely a client-side code reorganisation.

## Effort

S — three files touched; logic is mechanical extraction with no behavior change.
