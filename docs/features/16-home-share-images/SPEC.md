# 16 — home-share-images

## Goal

Give the homepage two purpose-built share images, both mirroring the proven diploma
image pattern (an SVG generator rendered to PNG via Cloudflare Image Resizing, with
an SVG fallback). Cover the **two distinct distribution mechanics** a social platform
can use:

1. **Landscape 1200×630** — the `og:image` for automatic **link previews** (X,
   Facebook, WhatsApp, LinkedIn, Telegram, Discord; plus the IG Stories link sticker
   and IG DMs). Replaces today's SVG-only `/og/home.svg` (which X/FB/WhatsApp reject)
   and redesigns the weak abstract mini-grid into a real bingo card with readable
   situation text and a hook line.
2. **Portrait 1080×1920** — an uploadable **Story/Reel/TikTok** graphic for the
   platforms that render no link preview at all (IG feed/Reels, TikTok). Mirrors the
   existing diploma `[id]-story` format.

## Branch

`feat/16-home-share-images`

## Size

`M` — two distinct image compositions (landscape + portrait), each with its own SVG
generator + PNG endpoint, delivered as two phases (one gate-green commit each, single
PR). No schema, no new runtime dependency. The diploma already proves the entire
pattern end to end, so risk is low but the surface is two designs, not one.

## Dependencies

None — the SVG→PNG self-fetch pattern is already proven by `15`/diploma PNG
(`src/pages/og/diploma/[id].png.ts`). No blocking deps.

## Context

The current `Layout.astro` defaults `ogImage = '/og/home.svg'` with
`ogImageType = 'image/svg+xml'`. X (Twitter), LinkedIn, WhatsApp, and Facebook
all reject SVG as `og:image`; their crawlers discard it silently — hence no preview
card appears when the game URL is shared. The diploma share (`/og/diploma/[id].png`)
already uses the CF Image Resizing self-fetch pattern, proving the path works on
this Cloudflare Workers + D1 stack with no additional deps.

Independently, the current `homeSvg()` design is weak for social sharing: a 3×3
abstract mini-grid without situation text gives no context about the game's content.
Both problems are fixed together because the PNG endpoint wraps the same SVG source.

Separately, the home has **no portrait asset** at all. The diploma can be shared to
Instagram Stories / Reels via its 1080×1920 `[id]-story.png` (used by the diploma's
Instagram share button), but there is no equivalent *invite-to-play* graphic for the
game itself — so the platforms that ignore link previews (IG feed/Reels, TikTok) have
nothing to post. Phase 2 closes that gap with `/og/home-story.png`.

## Business goals

Every time a player shares the game URL (to friends, on X, in WhatsApp groups of EV
owners), the preview card is the conversion mechanism. A blank or missing image is a
dead share. A recognisable bingo card with relatable situation text is an
instant hook for the target audience (Spanish EV drivers).

## Technical goals

- Add `/og/home.png` and `/og/home-story.png` endpoints using the established CF
  Image Resizing self-fetch pattern. No new dependency; graceful SVG fallback in
  dev/unsupported plans.
- Update `Layout.astro` homepage default to reference the landscape PNG as `og:image`.
- Add `homeSvg()` (landscape) and `homeStorySvg()` (portrait) generators that share
  one situation-selection set and one text-wrap helper — deterministic (same output
  every call, cache-friendly).
- Keep `/og/home.svg` serving the landscape SVG fallback; add `/og/home-story.svg`
  for the portrait fallback.
- The portrait image is **not** a meta tag — it is an uploadable asset reachable at
  its endpoint URL (surfacing decision in *Decisions to confirm*).

## Scope

### In scope

**Phase 1 — landscape 1200×630 OG image**

1. **`src/pages/og/home.png.ts`** — new endpoint, mirrors `[id].png.ts`:
   self-fetch `/og/home.svg` with `cf.image = { format:'png', width:1200, height:630 }`;
   fall through to SVG on failure. `export const prerender = false`.

2. **`src/layouts/Layout.astro`** — change the default props:
   `ogImage = '/og/home.png'` and `ogImageType = 'image/png'`.

3. **`src/lib/og-image.ts` — `homeSvg()` redesign:**
   - Layout: title "El Bingo del Cargador" at top, full 3×4 bingo card in the
     centre, hook line "¿Cuántas llevas tú?" + CTA "bingo.gruxon.com" at bottom.
   - Content: 12 situations drawn **deterministically** from
     `src/data/situations.json` by a **fixed curated id list** (see Design →
     situation selection), same every call → cache-stable, stable under gameplay
     reordering of the pool.
   - Mark state: 4 cells pre-marked (grid positions 1, 4, 7, 10) with a red dab so
     the card looks mid-game — communicates the mechanic at a glance.
   - Text legibility: cell text **word-wrapped to ≤ 3 lines** at 17px (NOT
     truncated mid-sentence — the punchline is the hook). Situations are 22–46 chars
     (median 35) and fit in 1–2 lines at the chosen cell width; the 3-line cap with
     trailing `…` is only a safety net for any future longer entry.
   - No blank cells in the OG image (blanks exist in real cards; in the OG image
     all 12 slots show situations for maximum information density).
   - **Two-tier safe zone** (the primary display is full 1.91:1 — X/FB/WhatsApp/
     LinkedIn/IG-DM show it un-cropped — so the layout is designed for the full
     1200×630; the tiers below protect the squarer crops of WhatsApp thumbnails and
     IG Stories link stickers):
     - **Full zone (~1080×560, ≥60px margins):** the whole composition — title, 4×3
       card, hook + CTA — lives here. This is what nearly every share shows.
     - **Core zone (central ~630px-wide square, x≈285–915):** the **brand title and
       the CTA/URL** must sit centred within this band so they survive a centre
       square crop. The card's outer columns may clip in those tiny squarer
       thumbnails — acceptable, since at that size the card reads as texture, not
       legible copy; the title + URL are what must always survive. Do **not** shrink
       the card to fit the square (it would waste the primary full-ratio display).

4. **`docs/frontend/SEO.md`** — update the OG images note: homepage now uses
   `/og/home.png` (SVG fallback retained), plus the platform-coverage boundary.

**Phase 2 — portrait 1080×1920 Story/Reel/TikTok image**

5. **`src/lib/og-image.ts` — `homeStorySvg()`** — new portrait generator (1080×1920),
   reusing P1's situation set + `wrapCellText` helper. Portrait composition: big
   title top, 3×4 card (portrait transpose) in the centre, hook + large CTA bottom
   (layout in Design → `homeStorySvg()`).

6. **`src/pages/og/home-story.svg.ts`** and **`src/pages/og/home-story.png.ts`** —
   new endpoints mirroring the diploma `[id]-story.{svg,png}.ts` pair
   (`cf.image = { format:'png', width:1080, height:1920 }`, SVG fallback).
   `export const prerender = false`.

7. **`docs/frontend/SEO.md`** — note the portrait asset endpoint and that it is an
   uploadable graphic (not a meta tag).

### Out of scope / non-goals

- **Per-network OG variants** of the *landscape* image (different OG image per
  link-preview platform): unnecessary — they all consume the same 1200×630 `og:image`
  (see Design → platform coverage). Not built.
- **A homepage share/invite UI** that pushes the portrait image to a platform via the
  Web Share API (as the diploma's Instagram button does). This feature **produces**
  both assets and exposes the portrait at its endpoint URL; wiring a home "invítales
  a jugar" share button is a separate UI feature (the homepage has no share affordance
  today, and there are zero real users yet — see *Decisions to confirm* D-surfacing).
- **Dynamic/personalised home images** (showing the viewer's own card): requires
  identity in the request, which the homepage does not have.
- **Random or rotating situation selection**: determinism is required for
  cache-correctness; a curated fixed set achieves the same goal.

### Platform coverage (why one 1200×630 image is the right answer)

Link-preview rendering is driven by Open Graph (`og:image`) and Twitter Cards
(`twitter:image`), **not** by a per-network image asset. A single 1200×630 (1.91:1)
PNG is the universal standard and is consumed identically by every platform that
renders link previews:

| Platform | Renders link preview? | Mechanism | This image works? |
|---|---|---|---|
| X / Twitter | yes | `twitter:card=summary_large_image` (OG fallback) | ✓ — `twitter:image` already set in `Layout.astro:48` |
| Facebook | yes | `og:image` | ✓ |
| WhatsApp | yes | `og:image` | ✓ (smaller thumbnail; safe zone covers its crop) |
| LinkedIn / Telegram / Discord / Slack | yes | `og:image` | ✓ |
| **Instagram — Stories** | **yes (link sticker)** | OG image shown as sticker thumbnail (small, often centre-cropped) | ✓ partial — OG *is* used; safe zone matters here |
| **Instagram — DMs** | yes | `og:image` link-preview card | ✓ |
| **Instagram — feed posts** | no | captions carry no clickable link / no preview | n/a |
| **TikTok** | no (feed) | video platform, no link-preview cards | n/a via `og:image` |

So the OG image **does** reach Instagram — via the **Stories link sticker** (a small,
often centre-cropped thumbnail) and via **DMs** (a normal link card). It does **not**
reach the IG **feed** (no clickable links there) or **TikTok**. The Stories sticker
crop is exactly why the **safe zone** (below) matters: a 1.91:1 image rendered in a
small squarer sticker keeps only its centre, so the title/card/CTA must live there.

Reaching IG/TikTok as *primary content* (a full-screen Story/Reel, not a link
preview) needs a **vertical 1080×1920 share graphic** the user uploads — not an
`og:image`. **That is exactly Phase 2 of this feature** (`/og/home-story.png`),
modelled on the diploma `[id]-story.png`.

## Architecture impact

- New endpoints in `src/pages/og/` — same layer as the existing diploma PNG/story
  endpoints. No domain layer changes beyond the two generators in `og-image.ts`.
- `og-image.ts` gains an import of `situations.json` (already imported by
  `src/lib/card.ts` — no new module) and two new exported functions
  (`homeSvg` redesign, `homeStorySvg` new) plus a private `wrapCellText` helper.
- `Layout.astro` change is props-default only (landscape OG); all pages that pass an
  explicit `ogImage` prop are unaffected. The portrait image is referenced by **no**
  meta tag — it is reached only by its endpoint URL.
- No schema, no Worker binding, no env var.

## Design

### `/og/home.png.ts`

Identical structure to `src/pages/og/diploma/[id].png.ts` minus the id lookup:

```ts
export const prerender = false;
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = '/og/home.svg';
    const resp = await fetch(svgUrl, {
      cf: { image: { format: 'png', width: 1200, height: 630 } },
    } as unknown as RequestInit);
    if (resp.ok && resp.headers.get('content-type')?.startsWith('image/png')) {
      return new Response(resp.body, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=86400, immutable',
        },
      });
    }
  } catch { /* local dev / no Image Resizing */ }

  // Fallback: serve SVG (dev and unsupported plans)
  const { homeSvg } = await import('../../lib/og-image');
  return new Response(homeSvg(), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
```

### `homeSvg()` layout (1200×630)

```
┌────────────────────────────────────────────────────┐  y=0
│  [felt green bg #0b3d2e + radial gradient]         │
│                                                     │
│        EL BINGO DEL CARGADOR           y≈90        │
│   Desgracias de la carga pública, verificables      │  y≈135
│                                                     │
│  ┌──────┬──────┬──────┬──────┐                     │
│  │ sit0 │●sit1 │ sit2 │ sit3 │                     │  row0
│  ├──────┼──────┼──────┼──────┤                     │
│  │●sit4 │ sit5 │ sit6 │●sit7 │                     │  row1
│  ├──────┼──────┼──────┼──────┤                     │
│  │ sit8 │ sit9 │●sit10│sit11 │                     │  row2
│  └──────┴──────┴──────┴──────┘                     │
│                                                     │
│    "¿Cuántas llevas tú?"  •  bingo.gruxon.com      │  y≈595
└────────────────────────────────────────────────────┘  y=630
```

- Grid: 4 columns × 3 rows. Card spans x≈80→1120, y≈190→540. Each cell ~250×106px
  with a ~12px inner gutter → text box ~226px wide × ~90px tall.
- Cell background: `#f6f0df` (paper), border `#221f1a` 1.5px, radius 3px
- Cell text: SANS 17px, `#221f1a`, centred, word-wrapped (see below)
- Dab: red circle (#b02e22, r≈22, 70% opacity) centred on marked cells, behind text
- Title: SERIF bold 72px, `#fbbf24` (amber)
- Subtitle: SANS 26px, `#c7d2e0`
- Hook + CTA line: SANS 24px, `#c7d2e0`, `•` separator

### Text wrapping (SVG has no auto-wrap — must be done in code)

Greedy word-wrap helper in `og-image.ts`:

```ts
// Wrap text into ≤ maxLines lines of ≤ maxChars each (greedy by word).
// Overflow past maxLines is truncated with a trailing «…» on the last line.
function wrapCellText(text: string, maxChars = 24, maxLines = 3): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
    else { cur = next; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  }
  return lines;
}
```

`maxChars = 24` is conservative for the 226px text box at 17px (accounts for wide
glyphs and the `«»` guillemets used throughout the pool). Render each line as a
`<tspan x="{cx}" dy="...">`, vertically centred: first line `y = cellMid −
(n−1)·lineHeight/2`, `lineHeight ≈ 21px`. Escape each line with the existing
`escapeXml()`.

### Situation selection

Curated by **id** (not array index) so the OG card always shows the same punchy set
even if the gameplay pool is re-sorted:

```ts
import situations from '../data/situations.json';

// 12 curated situations for the share card — chosen for punch + length variety.
const OG_IDS = [
  'app-disponible', 'otra-app-mas', 'mantenimiento-eterno', 'plaza-ocupada',
  'nada-funciona', /* …7 more existing ids… */
];
const byId = new Map(situations.map(s => [s.id, s.text]));
// Resolve curated ids; top up from the head of the pool if any id was removed.
const OG_SITUATIONS = (() => {
  const picked = OG_IDS.map(id => byId.get(id)).filter(Boolean) as string[];
  for (const s of situations) {
    if (picked.length >= 12) break;
    if (!picked.includes(s.text)) picked.push(s.text);
  }
  return picked.slice(0, 12);
})();
const OG_MARKED = new Set([1, 4, 7, 10]); // grid positions with a dab
```

The implementer picks the final 12 ids from `situations.json` during execution
(prefer short, instantly-relatable ones). The top-up guard guarantees exactly 12
cells even if a curated id is ever renamed/removed — no broken image. **Both
generators (landscape + portrait) share this same `OG_SITUATIONS` set and the
`wrapCellText` helper** — defined once at module scope in `og-image.ts`.

### `homeStorySvg()` layout (1080×1920, portrait)

The whole canvas is the safe zone (no link-preview crop applies — it is uploaded
full-frame), so it can use the vertical space generously:

```
┌──────────────────────────┐  y=0     (1080 wide)
│ [felt green + gradient]  │
│                          │
│   EL BINGO                │  title, SERIF ~96px, amber
│   DEL CARGADOR            │  (two lines, centred)
│  Desgracias de la carga  │  subtitle SANS ~40px
│   pública, verificables  │
│                          │
│  ┌──────┬──────┬──────┐  │
│  │ sit0 │●sit1 │ sit2 │  │  3 cols × 4 rows
│  ├──────┼──────┼──────┤  │  (portrait transpose
│  │●sit3 │ sit4 │ sit5 │  │   of the same 12)
│  ├──────┼──────┼──────┤  │  cells larger: text
│  │ sit6 │●sit7 │ sit8 │  │   ~26px, wraps wider
│  ├──────┼──────┼──────┤  │
│  │ sit9 │sit10 │●sit11│  │
│  └──────┴──────┴──────┘  │
│                          │
│   «¿Cuántas llevas tú?»  │  hook SANS ~44px
│                          │
│    bingo.gruxon.com      │  CTA SERIF ~56px, amber
│                          │
└──────────────────────────┘  y=1920
```

- Reuses `WIDTH`/`HEIGHT` story constants already in `og-image.ts`
  (`STORY_WIDTH = 1080`, `STORY_HEIGHT = 1920`, `STORY_CX = 540`).
- Grid: 3 columns × 4 rows (portrait transpose of the canonical landscape card).
  Cells are larger than the landscape image (~300×180px) so `wrapCellText` is called
  with a higher `maxChars` (~16–18 for the narrower 3-col width but taller cells →
  up to 4 lines). Tune during execution against the real situation lengths.
- Marks: 4 dabs at portrait-grid positions chosen to look mid-game (e.g. 1, 3, 7, 11).
- Palette/fonts identical to `homeSvg()` and the diploma story for brand consistency.
- No QR (unlike the diploma story, which verifies a specific card — the home invite
  has nothing to verify; the URL text is the call to action).

## Decisions to confirm

| Decision | Chosen | Rationale |
|---|---|---|
| Deliver **both** 1200×630 and 1080×1920 | ✓ (owner decision) | Cover both distribution mechanics: link preview (landscape) + uploaded Story/Reel/TikTok content (portrait) |
| PNG via CF Image Resizing self-fetch | ✓ — same as diploma | No new dep, already proven for both ratios |
| Shared situation set + wrap helper across both | ✓ | DRY; one curated set, one helper — both images stay consistent |
| Situation selection: curated **by id** + top-up guard | ✓ | Deterministic & cache-stable; survives gameplay reordering; can't break if an id is removed |
| Cell text: word-wrap, not truncate | ✓ | The punchline is the hook — truncation kills the marketing value (situations 22–46 chars) |
| **D-surfacing: portrait reached by endpoint URL only, no home share UI** | ✓ **CONFIRMED (owner, 2026-06-24)** | Feature scope is *producing* the assets; the homepage has no share affordance today and there are 0 real users (memory `production-users`). A home "invítales a jugar" Web-Share button (like the diploma's IG button) is a separate future UI feature, not part of 16. |
| Portrait omits the QR | ✓ | Diploma story QR verifies a card; the home invite has nothing to verify — the URL is the CTA |
| Single landscape OG for all link-preview networks | ✓ | Per-network OG variants unnecessary |

## Acceptance criteria

**Phase 1 — landscape**
- [ ] `GET /og/home.png` returns `content-type: image/png` on the deployed Worker
      (requires CF Image Resizing — confirm in prod, not local dev).
- [ ] `GET /og/home.svg` continues to return `image/svg+xml` unchanged.
- [ ] The homepage `<meta property="og:image">` references `/og/home.png`.
- [ ] The landscape image shows a 4×3 bingo card with readable situation text in all
      12 cells; 4 cells carry a dab mark, the other 8 do not.
- [ ] Full composition sits within the ~1080×560 full zone (≥ 60px margins); brand
      title and CTA/URL are centred within the ~630px core band so a centre square
      crop (WhatsApp thumb / IG Stories sticker) keeps them legible.
- [ ] Pasting `https://bingo.gruxon.com` into the X Card Validator renders a preview
      image — no blank card.

**Phase 2 — portrait**
- [ ] `GET /og/home-story.png` returns `image/png` on the deployed Worker (SVG
      fallback in local dev).
- [ ] `GET /og/home-story.svg` returns `image/svg+xml` and renders a 1080×1920
      portrait: title, 3×4 card with readable text, hook, and large CTA URL.
- [ ] The portrait reuses the same curated 12 situations as the landscape image.
- [ ] No meta tag references the portrait image (it is an uploadable asset only).

**Both**
- [ ] `npm run build` passes (gate) after each phase.

## Testing requirements

- **Gate:** `npm run build` — Astro type-checks all `.astro` and `.ts` files.
- **Manual (prod):** X Card Validator (`cards-dev.twitter.com/validator`) confirms
  image loads. LinkedIn Post Inspector is optional.
- **Local dev:** `/og/home.png` falls back to SVG (expected — CF Image Resizing not
  available locally); `/og/home.svg` renders the new grid design.

## Dev scenarios

| Scenario | Reproduces | Mechanism |
|---|---|---|
| `og:home-svg-fallback` | landscape PNG in local dev | Open `http://localhost:4321/og/home.png` — expect SVG fallback |
| `og:home-svg-design` | landscape SVG layout | Open `http://localhost:4321/og/home.svg` — verify 4×3 grid with text |
| `og:home-meta-tag` | Layout default flipped to PNG | View-source on homepage, check `og:image` href |
| `og:home-story-svg` | portrait SVG layout | Open `http://localhost:4321/og/home-story.svg` — verify 1080×1920 portrait |
| `og:home-story-fallback` | portrait PNG in local dev | Open `http://localhost:4321/og/home-story.png` — expect SVG fallback |

## Phases

Phased (Size M), one gate-green commit per phase, single PR after P2:

- **P0 — planning:** generate `TASKS.md` (+ running docs); this SPEC is the source.
- **P1 — landscape 1200×630:** `home.png.ts` endpoint, `homeSvg()` redesign +
  `wrapCellText` + `OG_SITUATIONS`, `Layout.astro` meta flip, SEO doc note. Gate.
- **P2 — portrait 1080×1920:** `homeStorySvg()`, `home-story.svg.ts` +
  `home-story.png.ts` endpoints, SEO doc note. Gate.
- **P3 — PR:** mark done, open PR.

## Deploy & rollback

n/a — no schema, no migration, no env var. Rollback = revert PR. CF Image Resizing
must be enabled on the zone for PNG; without it both endpoints serve SVG (no
regression).

## Open questions / risks

- **CF Image Resizing plan requirement:** the zone must have Image Resizing enabled
  (paid Cloudflare plan feature). If it isn't, the endpoint silently serves SVG —
  which is the pre-fix state, so no regression. Verify on first prod deploy.
- **Situations re-ordering risk:** RESOLVED — selection is by curated **id**, not
  array index, so re-sorting the pool does not change the OG card. A removed/renamed
  id is absorbed by the top-up guard (still 12 cells). No action needed.

## Deliverables

P1 (landscape):
- `src/pages/og/home.png.ts` (new)
- `src/lib/og-image.ts` — `homeSvg()` redesigned + `wrapCellText` + `OG_SITUATIONS`
- `src/layouts/Layout.astro` — default `ogImage`/`ogImageType` updated
- `docs/frontend/SEO.md` — OG images note updated

P2 (portrait):
- `src/lib/og-image.ts` — `homeStorySvg()` (new)
- `src/pages/og/home-story.svg.ts` (new)
- `src/pages/og/home-story.png.ts` (new)
- `docs/frontend/SEO.md` — portrait asset note

## Post-merge next feature

`06-achievements-badges` or `07-situations-total-count` (both `planned`, no hard dep
on this feature).
