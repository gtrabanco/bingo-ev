# 01 — final-certificate-design · Progress

## P5 — Feature A: 12-month retention GC (done)

Completed cards older than 12 months are now swept by the opportunistic GC that
already runs on each `POST /api/cards`.

**`src/pages/api/cards/index.ts`:**
- Before the main batch, SELECTs grouped completed cards older than 12 months
  and runs `settleDeparture(group_id, id)` for each (winner vacated, owner
  transferred, empty room dissolved).
- The main `db.batch([...])` gains a second DELETE:
  `DELETE FROM cards WHERE completed_at IS NOT NULL AND datetime(completed_at) < datetime('now', '-12 months')`
- `orphanedOwnerRepair` backstop kept after both sweeps.

**`src/lib/groups.ts`:** no changes — `settleDeparture` already existed.

**Mirror in `groups/index.ts`:** not added (D6: the sweep in `cards/index.ts`
is comprehensive; no correctness gain from duplicating it).

**`docs/domain/README.md`:** retention rule updated with GC implementation detail.

Build green. Manual verification pending (insert old completed card in local D1,
issue a card, confirm deletion and group settlement).

## P4 — Feature A: unmark invalidation + lock (done)

Implemented the diploma lifecycle rules (D3). Server is authoritative; client
mirrors the lock state for immediate UX feedback.

**Domain (`src/lib/card.ts`):**
- `MARKS_LOCK_HOURS = 24` — the constant; shared by Worker + browser.
- `marksLockAt(completedAt)` — returns `completedAt + 24h` as a `Date`.
- `areMarksLocked(completedAt, now?)` — `true` when past the lock threshold.

**Server (`src/pages/api/cards/[id]/marks.ts`):**
- Now SELECT-before-UPDATE: fetches `completed_at` + `cells` for the card
  (same `WHERE id AND secret` guard).
- 409 if `areMarksLocked(completed_at)` — enforced independently of the client.
- Within grace + new marks not a full card → clears `completed_at` in the same
  UPDATE; returns 204.

**API client (`src/lib/api.ts`):**
- `syncMarks` changed from fire-and-forget `void` to `Promise<'ok'|'locked'|'error'>`.
- Uses a raw `fetch` (not `request()`) to distinguish 409 from other failures.

**UI (`src/pages/index.astro`):**
- `areMarksLocked` imported from `card.ts`.
- `toggleCell`: blocks immediately (toast) if locked; sets `card.completedAt = null`
  and shows "Diploma anulado" toast when a within-grace un-mark breaks the bingo.
- `scheduleMarksSync`: awaits `syncMarks`; on `'locked'` re-fetches + restores state.
- `renderGrid`: `button.disabled = expired || locked`.
- `syncStatus`: shows "Cartón sellado" text when locked; correct diploma-button
  visibility (hidden when `completedAt === null`).

**Docs (`docs/domain/README.md`):**
- Replaced "Once sung, a bingo stays sung" with the grace/lock/retention rules.

Build green. Manual verification pending (in-progress at `/v/<id>`, grace
invalidation, post-24h lock).

## P3 — OG parity (done)

Rebuilt `diplomaSvg` in `src/lib/og-image.ts` to match the final PNG design
at 1200×630:

- Same palette, frame (outer 9px + inner 1.5px), corner ornaments, eyebrow,
  ¡BINGO!, certifying block, honorific seal (rotated −3.7°), small print,
  issued date, verify URL.
- No QR on OG (link is the action; see SPEC).
- Removed `@import url('fonts.googleapis.com/...')` from both `diplomaSvg`
  and `homeSvg` (was always a no-op; see `decisions.md` D1).
- `src/pages/og/diploma/[id].svg.ts`: now selects `marks` + `cells`, derives
  honorific via `honorificFor`, passes it to `diplomaSvg`. Local `FALLBACK_NICK`
  constant removed — imported from `certificate-design.ts`.
- Folded P2 review-change fixes: typo `drawHonorifcSeal` → `drawHonorificSeal`;
  removed unused `cardId` param from `drawVerificationQr`.

Build green. OG endpoint verified at `/og/diploma/o9crkwjz.svg`: 200, correct
honorific, frame + corner ornaments + rotated seal + verify URL present, no
Google Fonts. Per-honorific visual check: manual browser step.

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
