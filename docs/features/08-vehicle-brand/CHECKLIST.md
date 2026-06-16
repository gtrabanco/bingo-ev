# 08 — vehicle-brand: completion checklist

- [x] Schema migration applied (0009_vehicle_type.sql — additive, DEFAULT NULL)
- [x] Core layer (`lib/card.ts`) has no outer imports — VEHICLE_TYPES constant added
- [x] Storage layer (`lib/storage.ts`) — saveVehicleType / loadVehicleType added
- [x] API client (`lib/api.ts`) — registerCard accepts vehicleType; syncAlias accepts vehicleType; fetchOwnedCard return type includes vehicleType
- [x] POST /api/cards — validates vehicle_type against VEHICLE_TYPES, inserts with card
- [x] POST /api/cards/:id/alias — accepts vehicle_type, COALESCE prevents overwrites
- [x] GET /api/cards/:id — returns vehicleType in recovery payload
- [x] UI (index.astro) — vehicle select in alias form, hidden once type is set, Tesla UA hint
- [x] Recovery flow adopts vehicleType from server if not set locally
- [x] Unknown vehicle_type values silently coerced to null (server-side validation)
- [x] `npm run build` passes (type-check clean)
- [x] Local D1 migration applied

## Decisions not in SPEC

- "Prefiero no decirlo" is represented by the default empty placeholder option (leaving the select unchanged = null stored). No separate explicit skip option was needed — the placeholder communicates optionality clearly.
- PHEV brands not split (single `phev` value) — matches SPEC decision table.
- Vehicle select hidden (not disabled) once type is set, so the alias edit form stays clean on repeat visits.
