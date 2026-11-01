# Capability inventory

> The maintained list of this project's **cross-cutting subsystems** and
> **roles** — the substrate `design-feature`'s *Integration closure* walks so
> no feature ships without deciding how it touches auth, ACL, navigation, and
> the rest. A model cannot reliably *guess* which subsystems your project has,
> but it can *walk a list* — this file is that list.
>
> **Ownership & lifecycle:** seeded by `init-workspace` (from discovery +
> interview); **extended by `execute-phase`** whenever a phase introduces a new
> subsystem, role, or permission (additive, in the same commit as the code);
> freshness-checked by `product-audit` (inventory ↔ code drift is a Process &
> docs finding); **read by `design-feature`** for every feature's Integration
> closure. Keep every row honest — a subsystem marked `no` is as load-bearing
> as one marked `yes` (it tells the designer what does NOT exist yet).

## Roles

Every role/permission level the project has. `design-feature`'s role matrix
must list EVERY row here with an explicit `allowed`/`denied` per capability.

| Role | Description | Granted where |
|---|---|---|
| Card owner | The holder of the card id + secret; can mutate their card, leave/kick from groups, delete their card | Chosen at card creation; secret stored in localStorage |
| Authenticated account | An optional Google/X social login that can hold cards, link/unlink them, publish an opt-in public profile and erase the account entirely. Never required to play | OAuth2 Authorization-Code + PKCE at `src/pages/api/auth/[provider]/start.ts` → `callback.ts`; session cookie from `src/lib/auth.ts` |
| Group member | A card id assigned to a group with a nickname | Added by the group owner or self-joined |
| Group owner | The first member of a group; retains ownership unless transferred via `settleDeparture` | Implicitly the creator; transferred on departure/deletion |

## Cross-cutting subsystems

One row per subsystem. `Exists` is `yes | no | partial` — never blank. Delete
rows that can never apply to this product (e.g. `Billing` for an internal
tool) and add project-specific ones (the fixed set below is the floor, not the
ceiling).

| Subsystem | Exists | Surfaces / entry points | Notes |
|---|---|---|---|
| Authentication | partial | `src/pages/api/auth/[provider]/{start,callback}.ts`, `src/pages/api/auth/logout.ts`, account-scoped routes under `src/pages/api/account/` | **Optional** social login (Google + X) layered additively on the card-id + secret identity — play never requires it. Hand-rolled OAuth2 Authorization-Code + PKCE via `fetch`/Web Crypto (no SDK, no runtime dep). Session token is a SHA-256 hash stored in D1 (`sessions`), delivered as an HttpOnly/Secure/SameSite=Lax cookie (`src/lib/auth.ts`). Tables: `accounts`, `sessions`, `oauth_state` (`migrations/0011_accounts.sql`), `accounts.public_handle` + `profile_public` (`0013_profiles.sql`) |
| ACL / permissions | partial | Ownership checks inside every mutating route | No role-based ACL. The real rule (AD-004): **account auth OR the card's owner secret** authorizes a card mutation — either proof is sufficient. Group moderation (kick/leave) additionally requires the caller to hold the group owner's *card* (`groups.owner_card_id`). Group handle blocklist is bypassable only for the configured service-owner account (`OWNER_EMAIL`/`OWNER_X_USER_ID` env, `src/pages/api/account/profile.ts`) |
| Navigation (menus, dashboard) | yes | Site navigation, group standings, gallery | `src/components/SiteNav.astro` |
| Notifications (email, push, in-app) | partial | Newsletter opt-in (Brevo API), email flows | `src/lib/brevo.ts` |
| Search | no | — | No search feature |
| Audit log / activity trail | no | — | No audit log |
| Settings / preferences | no | — | No user settings |
| Background jobs / scheduling | no | — | Workers has no cron in this project |
| File / media storage | partial | Static fonts in `public/fonts/`, OG image endpoints | `@resvg/resvg-wasm` for PNG conversion |
| i18n / localization | no | — | Spanish (es-ES) only; no locale switcher |
| Feature flags | no | — | No feature flag system |
| Billing / payments | no | — | Free game, no payments |
| Public API / integrations | yes | API routes under `src/pages/api/`, Brevo, D1 | `src/lib/api.ts` client boundary |