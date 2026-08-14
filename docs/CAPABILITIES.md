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
| Group member | A card id assigned to a group with a nickname | Added by the group owner or self-joined |
| Group owner | The first member of a group; retains ownership unless transferred via `settleDeparture` | Implicitly the creator; transferred on departure/deletion |

## Cross-cutting subsystems

One row per subsystem. `Exists` is `yes | no | partial` — never blank. Delete
rows that can never apply to this product (e.g. `Billing` for an internal
tool) and add project-specific ones (the fixed set below is the floor, not the
ceiling).

| Subsystem | Exists | Surfaces / entry points | Notes |
|---|---|---|---|
| Authentication | no | — | No accounts or auth; card id + secret is identity |
| ACL / permissions | no | — | No role-based permissions; card-level ownership only |
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