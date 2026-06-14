# Domain

The language of the game, independent of framework or storage. Pure logic lives in
`src/lib/card.ts` and `src/lib/wins.ts`.

## Entities & value objects

- **Cartón (card)** — a 3×4 canonical landscape grid (`ROWS=3`, `COLS=4`, 12 cells,
  row-major). Each row holds exactly 2 situations + 2 blanks, so 6 situations per card,
  drawn at random from the pool. The chosen layout (situation ids) is stored with the
  card, so it keeps rendering even if the pool changes. `CardState`: `id`, `createdAt`,
  `completedAt`, `cells` (12 entries; `null` = blank), `marks`, `secret`, `groupId`.
- **Card id** — 8 chars `^[0-9a-z]{8}$`. Public identifier in all URLs.
- **Owner secret** — 16 chars, kept in the owner's browser; authorizes mutations.
- **MarkKind** — `0` clean · `1` suffered it · `2` caused it (sinvergüenza). Wire format
  is a row-major digit string, e.g. `"010020100001"` (`^[012]{12}$`). Both `1` and `2`
  count toward línea/bingo.
- **Alias** — a display label (group standings, shared views). **Not** an identifier;
  not unique.
- **Situation** — `{ id, text }` from `src/data/situations.json` (~40 entries, es-ES).
- **Group (sala)** — `id`, unique `name`, `join_policy` (`open`/`password`),
  `public_board`, `owner_card_id`, `winner_card_id`. A card belongs to at most one group.

## Rules

- **Línea**: a canonical row whose 2 situations are both marked (blanks don't count) →
  "¡Línea!". Bingo: all 6 situations marked → certificate. **Once sung, a bingo stays
  sung** — unmarking later never revokes the diploma (`completedAt` is sticky).
- **Win detection is orientation-independent**: always computed from `ROWS`/`COLS`, never
  the rendered grid. In portrait a completed row lights up vertically — correct.
- **Honorific** (one certificate, title by behavior): «Resignado Sufridor» (0 caused),
  «Granujilla» (1–2 caused), «Sinvergüenza» (≥ half of 6 caused).
- **Expiry**: a card must be completed within one calendar month of creation while
  incomplete (`expiryFromCreatedAt`, clamped for short months). Client enforces the UI;
  the **server clock is authoritative** for completion/verification.
- **One card, one group**: a card already in a group can't create or join another;
  regenerating the card is the way out.
- **Group win**: only the FIRST completion claims `winner_card_id` (atomic). Later bingos
  still earn their own diploma. Completed cards can't join a group.
- **Departures** (leave / kick / any card deletion) run `settleDeparture`: vacate the
  trophy if held, hand ownership to the most veteran remaining member, dissolve an empty
  room.

## Glossary

- **cartón** — bingo card. **línea** — a completed row. **bingo** — full card.
- **sala / grupo** — a competition room. **sinvergüenza** — someone who *caused* the
  misfortune (mark kind 2). **resignado** — someone who only *suffered* it (kind 1).
- **diploma / certificado** — the downloadable PNG proof, verifiable at `/v/<id>`.
