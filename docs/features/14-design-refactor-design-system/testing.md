# 14 — testing

No automated suite. Gate = `npm run build` green. Everything below is **manual**
verification via `npm run dev` + the preview MCP (snapshots, console, network,
resize). Run a scenario's row when its slice lands; the DOM-hook and font-loading
rows are the highest-risk.

## Per-slice manual matrix

| Scenario | Slice | How to verify | Pass criteria |
|---|---|---|---|
| `fonts:self-hosted` | S1 | Network panel on any page | requests to `/fonts/*.woff2`; **zero** `fonts.googleapis.com`/`gstatic`; titles Bricolage, serials Space Mono |
| `fonts:no-reflow` | S1 | Reload throttled (Slow 3G); watch first paint | preload present; no visible text reflow/shift on swap (CLS); fallback metric-tuned |
| `card:no-bingo` | S2 | Home cartón header + expire an incomplete card | no "BINGO" word; serial + "Vía pública"; "Caducado" stamp on expired |
| `nav:flows` | S3 | Click each nav affordance | Google/X OAuth **starts**; device-code panel opens; profile create/edit/disable works; logout works; "Borrar todo" dialog opens + deletes |
| `nav:logged-states` | S3 | Toggle session (logged out / in) | logged-out: provider glyphs + "Jugar con cuenta"; logged-in: label · profile · logout · "Borrar todo" |
| `home:protagonist` | S4 | Home at sm/lg | single centered column; card is visual lead; no redundant H1; dialogs/panels intact |
| `cardframe:parity` (c) | S5a | `/c/{id}` | shared `<CardFrame>`; transpose correct; no stale frame |
| `cardframe:parity` (v) | S5b | `/v/{id}` | "Acta" frame uses `<CardFrame>`; verdict stamps + social footer intact |
| `cardframe:parity` (g) | S5c | `/g/{id}` public **and** private | both boards use `<CardFrame>`; JS `renderPrivateBoard` twin matches server markup |
| `pages:shell` | S6 | hall-of-fame, jugador, activar, terminos, privacidad | global SiteNav present (or intentional opt-out); no orphaned back-link; prose in new type |
| `gallery:parity` | S6 | hall-of-fame vs jugador diploma cards | identical honorific colors/styling across both surfaces |
| `diploma:png-lora` | S7 | Complete a card, download the PNG | rendered in Lora/Space Mono, **not** Georgia |
| `og:subset` | S8 | Fetch `/og/home.svg`, `/og/diploma/{id}.svg`/`.png` | renders Lora (subset); image weight acceptable; **no runtime dep added** |
| `a11y:nav-contrast` | S1/S3 | Contrast tool on `.nav-action` muted text + 10px labels + small Space Mono serials on felt-900 | WCAG AA (≥4.5:1 normal text; ≥3:1 large) |
| `degraded:offline` | S3/S5 | Stop the Worker, play | game still works offline; no nav flow throws |

## Regression sweep (run before each PR)

- `npm run build` green.
- No new console errors on home, `/c`, `/v`, `/g`, hall-of-fame.
- Win detection unchanged (mark a line; "línea"/"bingo" fires as before).
- Expired-card stamp still renders.
- Mobile ≤640px: nav compresses (brand text hides, logo stays); no overflow.
- Landscape phone: cartón shows canonical landscape; cells fit.
