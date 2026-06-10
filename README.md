# El Bingo del Cargador — bingo.gruxon.com

Single-page parody bingo of typical public EV-charger problems in Spain. Each visitor gets a
random card ("cartón") modeled after a real Spanish bingo card: a 3x4 grid where each row
holds 2 situations and 2 blanks (6 situations total). Completing a row sings "línea";
completing all 6 within one month earns a downloadable mock certificate. Spanish UI with a
dry-sarcastic tone; no brand names anywhere.

Game state lives in `localStorage` (no auth, no accounts). A minimal Cloudflare D1 registry
makes completed cards **verifiable**: every diploma links to `/v/<cardId>`, a public page
that confirms the bingo was sung within the one-month window — per the server clock.

## Stack

- [Astro](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com)
- [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
  adapter: static homepage + a tiny server side (API + verification page) on
  Cloudflare Workers with a D1 database.
- [uqr](https://github.com/unjs/uqr) (~3 KB, zero deps) to draw the verification QR on the
  diploma — the only other runtime dependency.

## Project structure

```text
/
├── migrations/
│   └── 0001_init.sql              # D1 schema: the single `cards` table
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── BingoCard.astro        # Cartón frame (header strip, grid, footer strip)
│   │   └── CertificateModal.astro # <dialog>: canvas preview, PNG download, verify link
│   ├── data/
│   │   └── situations.json        # Single source of truth: the situation pool (Spanish)
│   ├── layouts/
│   │   └── Layout.astro           # HTML shell, meta, global styles
│   ├── lib/
│   │   ├── api.ts                 # Client for the registry API (degrades to offline play)
│   │   ├── card.ts                # Cartón generation + validation + expiry rule
│   │   ├── certificate.ts         # Certificate stub: canvas render + PNG download
│   │   ├── storage.ts             # localStorage persistence (guarded, in-memory fallback)
│   │   └── wins.ts                # Win detection: línea per row, bingo = all situations
│   ├── pages/
│   │   ├── api/cards/             # POST issue · POST [id]/complete · DELETE [id]
│   │   ├── v/[id].astro           # Public verification page (Verificado/En juego/No consta)
│   │   └── index.astro            # The whole game: markup + client-side wiring
│   └── styles/
│       └── global.css             # Tailwind import, theme tokens, cell/dauber styles
├── astro.config.ts
├── wrangler.jsonc                 # Worker config + D1 binding
└── package.json
```

## Commands

| Command           | Action                                  |
| :---------------- | :-------------------------------------- |
| `npm install`     | Install dependencies                    |
| `npm run dev`     | Dev server at `http://localhost:4321`   |
| `npm run build`   | Production build to `./dist/`           |
| `npm run preview` | Preview the production build locally    |

## How it works

- **Card**: 6 situations are drawn at random from `src/data/situations.json` (40 entries)
  and placed 2 per row on a 3x4 grid; the other cells are blanks, like a real cartón. The
  card gets a short serial id; the chosen layout is stored with it, so a saved card keeps
  rendering correctly even if the pool changes later.
- **Persistence**: `localStorage` keys — `evbingo.currentCardId` (pointer),
  `evbingo.card.<cardId>` (card + marks + completion), `evbingo.nick` (certificate name).
  All access is wrapped in try/catch so private-browsing modes degrade to in-memory play.
- **Wins**: real-cartón rules. Completing the situations of a row triggers a "¡Línea!"
  toast (blanks don't count); marking all 6 opens the certificate dialog ("¡Bingo!"). Once
  sung, a bingo stays sung even if cells are unmarked later.
- **Expiry**: a card must be completed within one calendar month of its creation. Expired
  incomplete cards are frozen under a "CADUCADO" stamp and must be regenerated. Enforced
  client-side for the UI and server-side (server clock) for verification.
- **Certificate**: a placeholder canvas render (1200×900) with "¡Bingo!", the nick, the
  completion date, the card serial, the verification URL and a QR pointing to it,
  downloadable as PNG. Final design pending.
- **Sharing**: dialog buttons for X and Bluesky (prefilled compose intents citing
  @gruxon), Instagram (Web Share sheet with the PNG on mobile; caption-copy + profile
  fallback elsewhere) and YouTube (caption-copy + channel — YouTube has no share intent).

## Verification registry (Cloudflare D1)

One tiny table (`migrations/0001_init.sql`): `cards (id, created_at, completed_at, nick)`.

Lifecycle — designed so the table stays small:

- **Issue** (`POST /api/cards`): the server generates the card id and creation timestamp.
  Each issue also sweeps expired, never-completed rows (opportunistic GC).
- **Complete** (`POST /api/cards/:id/complete`): accepted only within one month of
  creation, per the server clock. Late attempts get `410` and the row is deleted.
  Re-posting on a completed card only updates the diploma nick.
- **Discard** (`DELETE /api/cards/:id`): called when a card is regenerated or found
  expired. Completed cards are immune — their record is what makes diplomas verifiable.
- **Verify** (`GET /v/<id>`): public page with three outcomes — Verificado (completed in
  time, shows nick + date), En juego (registered, pending), No consta (unknown or expired).

If the API is unreachable, the game plays on with locally generated cards — they just
won't be verifiable. Astro's built-in CSRF check (`checkOrigin`) protects the endpoints
from cross-site form posts.

## Local development

```sh
npm install
npx wrangler d1 migrations apply ev-bingo --local   # once, creates the local DB
npm run dev                                         # game + API + /v on :4321
```

## Deploy (Cloudflare Workers)

### Git-connected (Workers Builds) — recommended

Connect the repository to a Worker in the Cloudflare dashboard and set:

- **Build command**: `npm run build`
- **Deploy command**: `npm run deploy`

`npm run deploy` applies pending D1 migrations (`wrangler d1 migrations apply ev-bingo
--remote`, idempotent — already-applied ones are skipped) and then runs `wrangler deploy`,
so schema changes ship automatically with every push. If the build token ever lacks D1
permissions, run `npm run db:migrate` once locally and check the token scopes.

### Manual

```sh
npx wrangler login          # one time
npm run deploy              # migrations + deploy
```

The build emits the final Worker config to `dist/server/wrangler.json` (wrangler picks it
up automatically via `.wrangler/deploy/config.json`). Bindings without ids (e.g. the
adapter's `SESSION` KV) are auto-provisioned by wrangler on deploy.

## Out of scope for now

Auth, email capture, final certificate design, photo upload/collage, analytics and a
public gallery.
