# 08 — vehicle-brand

## Goal

Collect, optionally and anonymously, what type of vehicle the player drives when they first set an alias. Responses are stored against the card and will feed future analytics (feature 04). The question is skippable to respect privacy and avoid friction.

## Branch

`feat/08-vehicle-brand`

## Size

`XS` — one DB migration, one new field in the card-creation/alias flow, one API change. Implement in a single pass with `execute-phase 08`.

## Dependencies

None (hard). Feature 04 analytics will consume this data but does not need to exist first.

## Context

The game is played by EV drivers stranded at chargers, PHEV drivers who occasionally use public infrastructure, and curious ICE drivers. Knowing which segment plays is valuable for positioning the project to potential brand partners (feature 02 deferred) and for understanding the audience. The alias registration step is the natural, low-friction moment to ask — the player is already setting up their card identity.

## Business goals

- Provide a data signal for potential brand or partner conversations ("X% of players drive BEV, Y% are Tesla owners").
- Understand whether PHEVs are a meaningful segment (they use public chargers less reliably, which is on-theme).
- Give players a small personalisation moment without requiring an account.

## Technical goals

- Add a nullable `vehicle_type` column to `cards` — no other table touched.
- Accept the value at card-creation or alias-update time; never required.
- Keep the stored value as a stable string enum so it can be grouped in SQL without an extra lookup table.

## Scope

### In scope

- Migration 0009: `ALTER TABLE cards ADD COLUMN vehicle_type TEXT CHECK(vehicle_type IN (...)) DEFAULT NULL`.
- Optional selector shown in the alias registration UI (below the alias input), grouped by category: BEV brands, PHEV, ICE, skip.
- Server-side acceptance of `vehicle_type` in the card-creation endpoint; sanitised and validated against the allowed set before write.
- Value persisted and returned as part of card state (so a returning player sees their choice).

### Out of scope / non-goals

- Displaying vehicle type anywhere in the public UI (standings, shared card view) — privacy.
- Aggregated stats / dashboard — owned by feature 04.
- Changing the value after initial set — deferred; not needed for analytics.
- Listing every EV model — brand granularity is enough.

## Architecture impact

Touches `cards` table (additive migration — safe), the card-creation endpoint in `src/pages/api/`, and the alias flow in `src/pages/index.astro`. No new modules. Follows existing input-sanitisation pattern: value validated against the allowed enum server-side before any DB write.

## Design

### Allowed values (`vehicle_type` enum)

```
BEV brands (prefix bev_):
  bev_tesla | bev_renault | bev_vw | bev_hyundai | bev_kia | bev_byd
  | bev_cupra | bev_peugeot | bev_nissan | bev_bmw | bev_audi
  | bev_mercedes | bev_volvo | bev_other

Aggregated:
  phev   — any plug-in hybrid, brand irrelevant
  ice    — combustion / no EV

NULL    — player skipped the question
```

### UI grouping (alias flow, optional step)

```
[ Eléctrico puro (BEV) ▾ ]   → expands brand list + "Otra marca eléctrica"
[ Híbrido enchufable (PHEV) ]
[ Combustión / No uso VE ]
[ Prefiero no decirlo ]       → stores NULL, visually de-emphasised
```

The selector appears below the alias input before the "Empezar" button. It does not block submission.

### API change

`POST /api/cards` and `PATCH /api/cards/[id]/alias` (or whichever endpoint handles alias): accept optional `vehicle_type: string | null`. Server validates against the allowed set; unknown values are silently coerced to `null`.

### Migration

```sql
-- 0009_vehicle_type.sql
ALTER TABLE cards ADD COLUMN vehicle_type TEXT
  CHECK(vehicle_type IN (
    'bev_tesla','bev_renault','bev_vw','bev_hyundai','bev_kia','bev_byd',
    'bev_cupra','bev_peugeot','bev_nissan','bev_bmw','bev_audi',
    'bev_mercedes','bev_volvo','bev_other',
    'phev','ice'
  )) DEFAULT NULL;
```

## Decisions to confirm

| Decision | Chosen | Rationale |
|---|---|---|
| Brand granularity for PHEV | Single `phev` value, no brand split | PHEV usage of public chargers is incidental; brand split adds noise without payoff |
| Allow value update after set | No (for now) | Analytics needs stable data; update path deferred |
| Show current value to returning player | Yes, pre-select in the selector | Avoids "why are you asking again" friction |

## Acceptance criteria

1. A new card can be created without providing `vehicle_type` — the field is NULL and the game works normally.
2. A player who selects a vehicle type sees it pre-selected when they reopen their card (value round-trips through the API).
3. Submitting an unknown `vehicle_type` value from the client results in NULL stored (no 400 / no crash).
4. `npm run build` passes with the new column and field wired up.
5. The selector is visually skippable — "Prefiero no decirlo" is the last option and clearly de-emphasised.

## Testing requirements

Manual only (no test suite). Dev scenarios below cover the critical paths.

## Dev scenarios

| Scenario | Reproduces | Mechanism |
|---|---|---|
| `vehicle:skip` | Player submits alias without touching the selector | Leave selector at default (null) and submit |
| `vehicle:select-bev` | Player picks a BEV brand | Select e.g. Tesla, submit, reload page — value pre-selected |
| `vehicle:select-phev` | Player picks PHEV | Same flow |
| `vehicle:unknown-value` | Client sends garbage value | Manually POST with `vehicle_type: "spaceship"` — expect NULL stored |

## Deploy & rollback

Migration 0009 is additive (`ADD COLUMN … DEFAULT NULL`) — safe on live data, no backfill needed. Rollback: revert PR; existing rows unaffected (column dropped by the revert migration if needed, or left as NULL).

## Open questions / risks

- **Tesla UA detection** (noted in roadmap discussion): if `navigator.userAgent` includes `'Tesla'`, the selector could pre-select `bev_tesla` as a convenience UX hint. Low risk, easy win — can be added inline during implementation without changing the SPEC.

## Deliverables

- `docs/features/08-vehicle-brand/SPEC.md` (this file)
- Migration `migrations/0009_vehicle_type.sql`
- Updated card-creation and alias endpoints
- Selector UI in `src/pages/index.astro`
- Roadmap row updated to `done`

## Post-merge next feature

`04-analytics` — vehicle type data becomes queryable once that feature ships.
