# Roadmap

The single source of truth for feature **numbering, ordering, and dependencies**.
Every feature folder under `docs/features/<NN>-<slug>/` must have a row here, and
every row must have a folder (or be `planned` with no folder yet).

> The shipped game (cartón, dual marks, honorific certificate, groups with
> ownership/leave/kick/delete, email recovery, verification registry, GDPR page)
> predates this workflow and is **not** tracked as numbered features — it's the
> baseline. New work starts at `01`. Out-of-scope items below are lifted from
> `README.md`.

## Features

| NN | Slug | Status | Depends on | Summary |
|----|------|--------|------------|---------|
| 01 | `final-certificate-design` | done | — | Final diploma design across both renderers (PNG + OG, P1–P3 done). **Scope expanded 2026-06-15** (owner decision, bundled): + Feature A diploma lifecycle/integrity (unmark invalidation/lock, 12-month retention) + Feature B abuse prevention (Turnstile + rate-limit). SPEC: `01-final-certificate-design/` |
| 02 | `photo-upload-collage` | deferred | — | Let players attach/collage photos of real charger misery. Deferred: no planned execution until/unless a brand partner sponsors or funds the feature. |
| 03 | `public-gallery` | planned | 01 | **M.** Public, browsable `/galeria` of completed diplomas. Listing is **opt-out** (`cards.gallery_hidden`, default listed); filter/sort by honorific tier + vehicle_type with counts; text/seal cards linking to `/v/{id}` (no image thumbnails). Owner hide control + nick wordlist + `/privacidad` takedown path. **Per-person profile/counter is deferred** to `09` (needs durable identity). SPEC: `03-public-gallery/` |
| 04 | `analytics` | cancelled | — | Privacy-respecting analytics — superseded: Umami (cookieless) added directly in `03-public-gallery` and disclosed in `/privacidad` |
| 05 | `accounts` | planned | — | **M.** Optional durable identity via **social login (Google + X)**, layered *additively* on the card-id+secret model — never required for play. **Substrate only:** `accounts`/`sessions`/`oauth_state` tables + nullable `cards.account_id`; hand-rolled OAuth2 Authorization-Code + PKCE via `fetch`/Web Crypto (**no SDK / no new runtime dep**); strictly-necessary session cookie; secret-proven card linking + `account_id` stamped on cards created while logged in; account-delete. **No aggregation/dashboard UI** (deferred fast-follow) and **no public profile** (owned by `09`). New processors (Google, X) + session cookie → `/privacidad` + `legal/README` update. Account auth and owner-secret both authorize card mutations. SPEC: `05-accounts/` |
| 06 | `achievements-badges` | planned | 01 | Logros/badges so a player with multiple diplomas has something to chase. Two tiers: **per-card** badges (single diploma, no identity change — e.g. one-situation achievements) and **cross-card** badges that aggregate across all of a player's cards (e.g. "20+ distinct desgracias", "N from the *charger* category"). Requires tagging situations with **categories** (enabling slice). Cross-card tier needs durable aggregation → benefits from `05 accounts`; until then it can only aggregate per-browser via localStorage (device-bound, fragile). Positive badges follow once positive situations exist. See memory `achievements-badges-idea`. |
| 07 | `situations-total-count` | planned | — | XS: surface how many distinct desgracias exist in total (currently **43**, `src/data/situations.json`). Transparency + the denominator for the "X distinct" badge in `06`. |
| 08 | `vehicle-brand` | done | — | XS: optional vehicle-type selector at alias registration (BEV brand / PHEV / ICE / skip). Stored as nullable enum in `cards.vehicle_type`. Feeds future analytics (04) and brand-partner positioning. Tesla UA → auto pre-select as convenience hint. |
| 09 | `gallery-profiles` | planned | 03, 05 | Per-person public profile aggregating all of a player's completed diplomas, plus the "N bingos by the same player" counter on `03`'s gallery entries. Split out of `03` because it needs a durable cross-card identity the current model lacks (no accounts; alias/nick is never an identifier) — gated on `05 accounts`. |
| 10 | `multi-card-conflict` | planned | 05 | **S.** Conflict resolution when a logged-in account already has an active card and a second one is being linked (e.g. mobile card + Tesla card both linked to the same Google account). Shows a dialog asking the player which card to keep; warns if either card is in a group; escalates to a confirmation screen if the card being discarded is the group owner (ownership auto-passes via settleDeparture). One active card per account; completed cards (diplomas) are exempt. SPEC: `10-multi-card-conflict/` |

## Status legend

- `planned` — in the roadmap, not started
- `in-progress` — branch open, phases executing
- `done` — merged
- `deferred` — intentionally parked; no execution until external trigger (sponsorship, partner interest, etc.)

## Conventions

- Numbers are assigned in order and never reused.
- A feature that depends on another cannot start until its dependency is merged.
- Keep this table consistent with the feature folders (the `audit-docs` skill
  checks for drift).
