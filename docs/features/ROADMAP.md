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
| 03 | `public-gallery` | done | 01 | **M.** Public, browsable `/galeria` of completed diplomas. Listing is **opt-out** (`cards.gallery_hidden`, default listed); filter/sort by honorific tier + vehicle_type with counts; text/seal cards linking to `/v/{id}` (no image thumbnails). Owner hide control + nick wordlist + `/privacidad` takedown path. **Per-person profile/counter is deferred** to `09` (needs durable identity). SPEC: `03-public-gallery/` |
| 04 | `analytics` | cancelled | — | Privacy-respecting analytics — superseded: Umami (cookieless) added directly in `03-public-gallery` and disclosed in `/privacidad` |
| 05 | `accounts` | done | — | **M.** Optional durable identity via **social login (Google + X)**, layered *additively* on the card-id+secret model — never required for play. **Substrate only:** `accounts`/`sessions`/`oauth_state` tables + nullable `cards.account_id`; hand-rolled OAuth2 Authorization-Code + PKCE via `fetch`/Web Crypto (**no SDK / no new runtime dep**); strictly-necessary session cookie; secret-proven card linking + `account_id` stamped on cards created while logged in; account-delete. **No aggregation/dashboard UI** (deferred fast-follow) and **no public profile** (owned by `09`). New processors (Google, X) + session cookie → `/privacidad` + `legal/README` update. Account auth and owner-secret both authorize card mutations. SPEC: `05-accounts/` |
| 06 | `achievements-badges` | planned | 01 | Logros/badges so a player with multiple diplomas has something to chase. Two tiers: **per-card** badges (single diploma, no identity change — e.g. one-situation achievements) and **cross-card** badges that aggregate across all of a player's cards (e.g. "20+ distinct desgracias", "N from the *charger* category"). Requires tagging situations with **categories** (enabling slice). Cross-card tier needs durable aggregation → benefits from `05 accounts`; until then it can only aggregate per-browser via localStorage (device-bound, fragile). Positive badges follow once positive situations exist. See memory `achievements-badges-idea`. |
| 07 | `situations-total-count` | planned | — | XS: surface how many distinct desgracias exist in total (currently **43**, `src/data/situations.json`). Transparency + the denominator for the "X distinct" badge in `06`. |
| 08 | `vehicle-brand` | done | — | XS: optional vehicle-type selector at alias registration (BEV brand / PHEV / ICE / skip). Stored as nullable enum in `cards.vehicle_type`. Feeds future analytics (04) and brand-partner positioning. Tesla UA → auto pre-select as convenience hint. |
| 09 | `gallery-profiles` | done | 03, 05 | **M.** Per-person public profile (`/jugador/{handle}`) aggregating all of a player's completed diplomas, plus the "N bingos del mismo jugador" counter on `03`'s gallery entries. Aggregation key is `cards.account_id` (from `05`). **Opt-in** (D1): no profile is public until the player enables it and picks a unique, blocklist-checked **handle** (D2) that doubles as the public label (D3) — the real Google/X name is never exposed. Additive schema (`accounts.public_handle` + `profile_public`). Both deps (`03`, `05`) merged. SPEC: `09-gallery-profiles/`. |
| 10 | `multi-card-conflict` | done | 05 | **S.** Conflict resolution when a logged-in account already has an active card and a second one is being linked (e.g. mobile card + Tesla card both linked to the same Google account). Shows a dialog asking the player which card to keep; warns if either card is in a group; escalates to a confirmation screen if the card being discarded is the group owner (ownership auto-passes via settleDeparture). One active card per account; completed cards (diplomas) are exempt. SPEC: `10-multi-card-conflict/` |
| 11 | `hall-of-fame` | done | — | **S.** Top navigation bar consolidating four affordances on the game page: the **Hall of Fame** link, **Google/X login** buttons, the **logged-in user** chip (label + logout + profile control), and a **device-transfer** entry point. Slice 1 shipped (rename `/galeria` → `/hall-of-fame` with 301 redirect + bare nav link, PR #22); completed navbar in PR #24. UI-only, no schema, all element ids preserved. SPEC: `11-hall-of-fame/` |
| 12 | `bidirectional-device-transfer` | done | — | **M.** Add the *pull* direction to device transfer so a **card-less** device can receive a card. New additive `receive_slots` table + `/api/receive-slot` create/deposit/poll endpoints: a card-less device opens a **receive slot** at `/activar`, shows its QR (`?recv=CODE`) and polls; a card-holding device scans it and **deposits** its card; the receiving device adopts it. Covers the vehicle-screen case (car browser shows QR, phone scans, car loads phone's card). The existing *push* flow (`device_codes`) is unchanged. **Both-devices-have-a-card collisions reuse feature `10`'s decided semantics** (explicit choice, no mark-merge, no silent overwrite) via a collision guard in `recoverFromUrl()` — not an automatic push inversion. Resized S→M during planning. SPEC: `12-bidirectional-device-transfer/`. |
| 13 | `account-delete-full` | done | 05 | **S.** "Borrar todo": total RGPD-erasure deletion. **Repurposes** `DELETE /api/account` (today unlink-only, `account_id = NULL`, and not even wired to UI) to hard-delete the account **and all its cards — active *and* completed diplomas** (D1: completed-card immunity intentionally overridden for this explicit-request path only), settling each group departure via `settleDeparture` + `orphanedOwnerRepair` backstop, then sessions + account. Single exposed option — no unlink-only variant (D2). Confirmation `<dialog>` (destructive, irreversible). Deleted diplomas stop resolving at `/v/{id}` and leave the gallery. Updates `/privacidad` + `docs/legal/README.md` (erasure now total). No schema change. SPEC: `13-account-delete-full/`. |
| 14 | `design-refactor-design-system` | in-progress | — | **L.** Site-wide visual refactor applying the pre-authored design system in `14-design-refactor-design-system/integration/` (self-hosted Bricolage/Lora/Space Mono, `SiteNav` icon-over-label navbar, cartón without "BINGO", cartón-protagonist home). CSS/fonts/markup/copy **only** — game behaviour, identity model, and **every** DOM/script hook preserved verbatim (verified: empty `comm -23` of old-nav vs SiteNav ids). Owner decisions: whole-site incl. all 9 secondary pages (D2), diploma **and** OG images adopt real fonts (D3), home restructure included (D4). Delivered as **8 independently-shippable slices** S1–S8 (one PR each, never stacked): S1 fonts+`global.css`+preload+doc-convention, S2 drop-BINGO, S3 SiteNav swap, S4 home protagonist, S5 shared `<CardFrame>`+bespoke `c`/`v`/`g`, S6 light pages+site-wide nav, S7 diploma canvas fonts, S8 OG subset fonts. Fonts self-hosted woff2 (offline-converted, **no runtime dep** — D1/D8). Not issue-born — GitHub issue #14 is unrelated, **no** `Closes #14` (D9). SPEC: `14-design-refactor-design-system/`. |

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
