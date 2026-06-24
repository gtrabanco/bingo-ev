# 16 — home-share-images · Decisions

Decisions taken during execution that the SPEC did not fully settle.

## D1 — `renderCell` cell text capped at 3 lines (both layouts)

**SPEC said:** portrait cells could wrap "up to 4 lines"; tune `maxChars`/lines to
the larger cells.

**Decision:** `renderCell` hardcodes `maxLines = 3` for both the landscape and the
portrait generators (it calls `wrapCellText(text, maxChars, 3)`).

**Why:** verified against the actual curated set — the longest `OG_SITUATIONS`
entry (`app-disponible`, 46 chars) wraps to exactly 3 lines in both layouts
(landscape `maxChars=24`, portrait `maxChars=20`) with **no** truncation. A 4th
line is never needed for the current pool, so the simpler fixed cap is functionally
equivalent and avoids an extra parameter. The `…` overflow guard in `wrapCellText`
remains as a safety net if a much longer situation is ever added.

**Revisit if:** a future situation in the curated set exceeds ~60 chars and visibly
truncates in the portrait cells — then expose `maxLines` as a `renderCell` parameter
and pass 4 for portrait.

## D2 — `renderCell` extended with a `dabRadius` parameter

`renderCell` gained an optional `dabRadius` (default 26, landscape) so the portrait
generator can pass 40 — proportional to its much taller cells (~302px vs ~117px).
Backward-compatible; keeps a single shared cell renderer for both images (DRY).
