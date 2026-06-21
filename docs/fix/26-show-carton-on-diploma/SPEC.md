# fix/26-show-carton-on-diploma

## Goal

The diploma verification page (`/v/{id}`) surfaces the honorific and date but not
the bingo card itself. Showing which situations the player marked makes each diploma
unique, relatable, and shareable — it's the proof-of-play the certificate lacks.

## Issue

`#26`

## Branch

`fix/26-show-carton-on-diploma`

## Root cause

`src/pages/v/[id].astro` DB query only fetches `id, created_at, completed_at, nick`
(line ~19). The `cells` and `marks` columns exist in D1 but are not queried, so no
card data is available to render. The shared `/c/[id].astro` view already has the
full server-side render pattern for the card grid; it just needs to be replicated
in the `verified` verdict branch of `/v/[id].astro`.

## Scope

### In scope

- `src/pages/v/[id].astro`: extend DB query to include `cells, marks`; parse them
  server-side (same logic as `/c/[id].astro`); render the bingo card below the
  "Verificado" stamp using a `CardFrame` + the same cell grid pattern.
- Graceful fallback: if `cells` is null (old cards pre-dating cell storage), skip
  the card section silently — the stamp + date copy still render normally.

### Out of scope

- Thumbnail cards on the `hall-of-fame.astro` list: requires updating both the SSR
  grid and the client-side `entryHtml` JS function simultaneously; a separate,
  larger change.
- Showing the honorific title on `/v/[id]`: the page doesn't show it today; adding
  it would touch certificate-design logic. Tracked in the roadmap backlog.

## Impact

- Files touched: `src/pages/v/[id].astro` only.
- Blast radius: the verified verdict is a read-only, cached view; no write path.
  A bug in the card section degrades to a graceful "no card" render — the stamp
  and date copy are untouched.
- Detection: visible immediately on any `/v/<id>` URL for a completed card.

## Rules that must never be violated

- `import { env } from 'cloudflare:workers'` — already in place.
- `export const prerender = false` — already in place.
- Card transpose: portrait = CSS `grid-flow-col grid-cols-3 grid-rows-4`;
  landscape = `landscape:grid-flow-row landscape:grid-cols-4 landscape:grid-rows-3`.
  Win logic is never derived from the displayed grid — not relevant here (read-only).
- No new runtime dependencies.

## Risks

- Security: n/a — read-only query, no user input.
- Compliance: n/a.
- Old cards with null cells: handled by the graceful fallback.

## Acceptance criteria

- [ ] On `/v/<id>` for a **completed** card: the full 12-cell bingo card renders
  below the "Verificado" stamp, with each cell showing its situation text and
  its mark state (suffered / caused / blank).
- [ ] On `/v/<id>` for a completed card with **null cells** (legacy): the
  "Verificado" stamp and date render normally; no card section appears.
- [ ] On `/v/<id>` for a **pending** or **unknown** card: no card section appears
  (unchanged behaviour).
- [ ] `npm run build` passes.

## Rollback

`git revert <commit>` — reverts the query and render additions with no data-side
impact.

## Effort

XS — one-file change, established pattern.
