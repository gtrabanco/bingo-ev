# 01 — final-certificate-design · PLAN

> Execution plan derived from `SPEC.md`. Phases are independently gate-verified
> (`npm run build` green + manual visual check). One commit per phase.

## Phase map

| Phase | Outcome | Gate |
|---|---|---|
| P1 | Shared design module; no visual change | build green; PNG looks identical to before |
| P2 | Final PNG design | build green; 3 honorifics visually verified |
| P3 | OG card parity + endpoint honorific + drop webfont | build green; OG SVG visually verified |
| P4 | PR to `main` | build green; `Closes #<issue>` |

## P1 — Shared design module (refactor, no visual change)

Create `src/lib/certificate-design.ts` exporting:

- `PALETTE` — every hex currently inlined in `certificate.ts` / `og-image.ts`
  (`#f6f0df` paper, `#11503c` frame green, `#b02e22` dauber red, `#221f1a` ink,
  `#6b6354`/`#7c7464`/`#8a8170` muted, `#b8ab8c` rule).
- `HONORIFICS: Record<Honorific, { title; color; line }>` — moved verbatim from
  `certificate.ts`.
- Shared copy constants (eyebrow, certifying body lines, legal-joke footer,
  verify label, `FALLBACK_NICK`).
- Font stacks (`SERIF`, `SANS`, `MONO`).

Repoint `certificate.ts` to import from it. **No pixel change** — pure extraction.
Verify the PNG looks byte-for-byte the same as before.

## P2 — Final PNG design

Elevate `drawCertificate` using the shared tokens. Levers (decide concretely
while implementing, keep within the aged-paper/green-frame/dauber language):

- Frame: double border + corner ornaments.
- Honorific as a **seal/stamp** (rotated, ruled border) echoing `.expired-stamp`.
- Stronger type hierarchy and vertical rhythm; keep every existing content row.
- QR seal corner treatment crisper (keep integer-module scaling).

Visual-verify each honorific variant downloads a finished-looking PNG.

## P3 — OG parity

- Rebuild `diplomaSvg` to the same document at 1200×630: same paper, frame,
  `¡BINGO!`, nick, **honorific seal**, date, verify URL.
- Remove the `@import url('fonts.googleapis.com/...Georgia')`; use the shared
  `SERIF` system stack.
- Add honorific to the OG data path: in `src/pages/og/diploma/[id].svg.ts` select
  `marks`, derive via `honorificFor`, pass into `diplomaSvg`.
- Keep `escapeXml` on all interpolated user text (nick).
- Decide: include a small QR on the OG card or not (default: no — keep it light).

Visual-verify `/og/diploma/<id>.svg` for each honorific.

## P4 — PR

One PR to `main`, body `Closes #<issue>`. Flip the roadmap row to `done`.

## Sequencing / risk

P1 is a safe refactor that de-risks P2/P3 (no more duplicated honorific table).
P2 and P3 are independent after P1 but share the tokens, so do P2 first to settle
the visual language, then mirror it into the OG card in P3.
