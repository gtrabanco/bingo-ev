# 01 — final-certificate-design · Progress

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
