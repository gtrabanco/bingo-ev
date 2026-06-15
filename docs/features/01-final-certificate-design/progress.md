# 01 — final-certificate-design · Progress

## P2 — Final PNG design (done)

Elevated `drawCertificate` in `src/lib/certificate.ts`:

- **Frame:** outer 9px + inner 1.5px border. Added `drawFrame()` that places a filled diamond + four cross-arms at each inner-frame corner.
- **Honorific seal:** new `drawHonorifcSeal()` draws a rotated double-border rounded rectangle (outer 2px + inner 1px, gap 6px, radius 8px, rotation −3.7°) with a semi-transparent tinted background — echoing `.expired-stamp` (CSS `border: 4px double`, rotate).
- **Type hierarchy:** ¡BINGO! bumped from 150px to 160px; eyebrow tightened; body text at 24px; added a thin rule below eyebrow and above verify URL.
- **QR seal:** framed with a 1.5px green border + "VERIFICAR" label below.
- **Helper:** `roundedRectPath()` for cross-browser rounded-rect paths.

Build green. Visual check in preview (sinvergüenza honorific) — no JS errors, stamp renders with rotation and double border. Remaining manual checks (resignado, granujilla, empty-nick) for the user before P3.

## P1 — Shared design module (done)

Extracted all design constants from `certificate.ts` into a new
`src/lib/certificate-design.ts` module.

**What was created:**
- `src/lib/certificate-design.ts` — exports `PALETTE`, `SERIF`/`SANS`/`MONO`,
  `HONORIFICS`, `FALLBACK_NICK`, and `COPY` (shared copy helpers).
- `src/lib/certificate.ts` — all inlined hex literals and copy strings replaced
  with imports from the shared module. `HONORIFICS` definition removed locally.

**Gate:** `npm run build` green.

**Visual check:** pending manual download in browser (`npm run dev`).

**Left open for P2:** the canvas renderer still renders the stub design;
visual elevation happens in P2.
