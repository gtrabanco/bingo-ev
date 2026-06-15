# 01 — final-certificate-design · Decisions

## D1 — Google Fonts `@import` removed from `homeSvg` (P3)

**Decision:** Removed the `@import url('fonts.googleapis.com/...')` from
`homeSvg` in `og-image.ts`, even though the SPEC lists "The home OG image
(`homeSvg`)" as out of scope.

**Why:** TASKS.md acceptance criterion says "Verify no `fonts.googleapis.com`
remains anywhere." The import in `homeSvg` was always a no-op (Georgia is not
served by Google Fonts), so removing it is zero-risk and aligns with the project
rule "no webfonts." Leaving it would have left a misleading, rule-violating dead
line in the file while P3 claimed the rule was now satisfied.

**Impact:** None — the import was never executed by any crawler or renderer.
`homeSvg`'s visual output is identical before and after.
