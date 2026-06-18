# 09 — gallery-profiles · Testing

> No test suite/linter. Gate = `npm run build` (type-check). Everything else is
> manual via `npm run dev` + Claude Preview MCP. **Apply `0013` `--local` first** or
> the new columns won't exist:
> `npx wrangler d1 migrations apply ev-bingo --local`.
>
> The auth-dependent scenarios need a working OAuth login in dev (Google or X test
> app + `.dev.vars`). Where login isn't available, drive the account state directly
> with `wrangler d1 execute` (set `public_handle`/`profile_public`, stamp
> `account_id` on completed cards).

## Manual scenarios

| Scenario | Steps | Expect |
|---|---|---|
| `profile:create` | log in, account bar → "Crear perfil público", pick a free handle, activar | `204`; control shows the handle as a link |
| `profile:view` | complete ≥2 cards logged in, enable profile, open `/jugador/{handle}` | handle title, correct count, honorific breakdown, grid → `/v/{id}` |
| `profile:empty` | enable profile with no listed completed cards | empty-state page (dry es-ES), no grid |
| `profile:private-404` | set profile `public:false`, visit `/jugador/{handle}` | 404 |
| `profile:unknown-404` | visit `/jugador/doesnotexist` | 404 (identical to private) |
| `profile:handle-taken` | two accounts claim the same handle | second → `409 handle_taken`, no write |
| `profile:handle-invalid` | submit `"Ab"`, `"a b"`, 30 chars, `"UPPER"` | `422 handle_invalid` |
| `profile:handle-blocked` | submit `"gabriel"` / a slur | `422 Nombre reservado` / `Nombre inapropiado` |
| `profile:hidden-diploma` | hide one completed card (gallery toggle), reload profile | hidden card absent from profile too |
| `profile:no-realname` | inspect `/jugador/*` HTML + `/api/gallery` JSON (Network tab) | no `display_name` / `email` anywhere |
| `gallery:counter` | public account with ≥2 listed diplomas, open `/galeria` | "N bingos del mismo jugador" → `/jugador/{handle}` on its entries |
| `gallery:no-counter-private` | completed card on a private-profile (or no) account | no counter on that entry |
| `profile:degraded` | stop the Worker / force the 4 s timeout, load profile | empty/last-known render; game still playable |
| `gate` | `npm run build` | green (type-check passes) |

## Verification emphasis (most likely to regress)

1. **No real-name leak** (`profile:no-realname`) — the single most important privacy
   check. Grep the rendered HTML and the gallery JSON.
2. **Private ≡ unknown 404** (`profile:private-404` vs `profile:unknown-404`) — must
   be indistinguishable; otherwise private handles are enumerable.
3. **Hidden diploma consistency** (`profile:hidden-diploma`) — gallery hide must also
   hide on the profile.
4. **Handle uniqueness** (`profile:handle-taken`) — the unique index + `409` mapping.
