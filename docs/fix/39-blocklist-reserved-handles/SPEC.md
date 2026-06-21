# fix/39-blocklist-reserved-handles

## Goal

Expand the `reserved` blocklist to prevent public handles that impersonate the site
owner, the site itself, or well-known EV/car/charger brands that could be used for
advertising or impersonation.

## Issue

`#39`

## Branch

`fix/blocklist-reserved-handles`

## Root cause

`src/data/blocklist.json` `reserved` array only covered the owner's primary identity
(`gabriel`, `trabanco`, `gtrabanco`, `gruxon`). Missing: personal name variants,
site-related terms, and the EV brand/network names that the project's no-advertising
stance requires blocking.

## Scope

### In scope

Add to `reserved` in `src/data/blocklist.json`:
- Owner variants: `gabrieltrabanco`, `gabi`, `gaby`
- Site terms: `bingo`, `ev`, `auve`
- EV car brands (Spanish market): `tesla`, `bmw`, `audi`, `volkswagen`, `hyundai`,
  `kia`, `renault`, `peugeot`, `citroen`, `opel`, `dacia`, `fiat`, `skoda`,
  `volvo`, `porsche`, `mercedes`, `ford`, `honda`, `toyota`, `nissan`, `seat`,
  `cupra`, `polestar`, `lucid`, `rivian`, `byd`, `nio`, `xpeng`, `zeekr`, `ioniq`
- Charging networks/brands: `ionity`, `endesa`, `iberdrola`, `repsol`, `wallbox`,
  `zunder`, `wenea`, `evbox`, `evgo`, `fastned`, `shell`, `enel`, `chargepoint`
- Spanish EV term: `electrolinera`

### Out of scope

- `blocklist.ts` logic (unchanged — substring match via `normalized.includes()`).
- `nsfw` array (unchanged).

## Impact

- Files touched: `src/data/blocklist.json` only.
- Blast radius: handles *containing* any new term as a substring will be rejected
  at write time. The `"ev"` entry (2 chars) has the widest blast radius — it blocks
  handles like `kevin`, `steve`, `clever`. This is intentional: the site's EV
  context makes any handle with "ev" likely brand-adjacent.
- Existing handles in the DB are not retroactively affected (blocklist only runs at
  write time on `/api/account/profile`).
- Detection: immediate — any user attempting to set a blocked handle gets a 422 with
  the reserved-handle error message.

## Rules that must never be violated

- All entries lowercase (normalization handles case).
- No changes to `blocklist.ts` logic or server endpoints.
- `npm run build` must pass.

## Risks

- Security: n/a.
- UX: short terms (`ev`, `kia`, `seat`) may block legitimate handles via substring
  match. Accepted as intentional — the audience and no-advertising stance justify it.
- Rollback of individual entries: edit `reserved` array and redeploy; no DB changes.

## Acceptance criteria

- [ ] `gabriel`, `bingo`, `tesla`, `auve` all rejected (422) via
  `POST /api/account/profile`. (`ev` removed — 2-char substring too aggressive;
  EV brands covered by explicit entries like `evbox`, `evgo`.)
- [ ] `gabrieltrabanco` rejected (matched via both explicit entry and `gabriel`
  substring).
- [ ] Owner bypass (fix/31) still lets the configured owner set any handle.
- [ ] `npm run build` passes.

## Rollback

Edit `src/data/blocklist.json` to remove entries and redeploy. No DB changes needed.

## Effort

XS — data-only edit, no logic change.
