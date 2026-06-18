# 09 — gallery-profiles · TASKS

> Concrete checklist per phase. Check off during `execute-phase`.
> Gate = `npm run build` green before each commit.

## P1 — Schema + profile API ✅
- [x] `migrations/0013_profiles.sql`: `ALTER TABLE accounts ADD COLUMN public_handle TEXT;`
      `ALTER TABLE accounts ADD COLUMN profile_public INTEGER NOT NULL DEFAULT 0;`
      `CREATE UNIQUE INDEX idx_accounts_public_handle ON accounts (public_handle);`
- [x] Apply locally: `npx wrangler d1 migrations apply ev-bingo --local`.
- [x] Handle validation helper (in `src/pages/api/account/profile.ts`):
      normalize (`trim().toLowerCase()`, strip control chars, cap 24), slug regex
      `^[a-z0-9-]{3,24}$`, then `checkNick()` from `src/lib/blocklist.ts`.
- [x] `POST /api/account/profile.ts` (`prerender = false`): session-auth (`401`);
      body `{handle, public}`; validate → `422 handle_invalid`; blocklist → `422`
      with the matching message; `UPDATE accounts SET public_handle=?, profile_public=?`;
      unique violation → `409 handle_taken`; success `204`.
- [x] Extend `GET /api/account` to return `publicHandle`, `profilePublic`.
- [x] `src/lib/api.ts`: `setProfile(handle, isPublic)` → `{ok} | {error}`; extend the
      account type with `publicHandle`/`profilePublic`. Degrade on failure.
- [x] Gate green.

## P2 — Profile page ✅
- [x] `src/pages/jugador/[handle].astro` (`prerender = false`): lookup
      `SELECT id FROM accounts WHERE public_handle=? AND profile_public=1`; no row →
      `Astro.response.status = 404` + inline 404 content (handle unknown and private
      are identical; no existence leak).
- [x] Diploma aggregation: `SELECT … FROM cards WHERE account_id=? AND
      completed_at IS NOT NULL AND gallery_hidden=0 ORDER BY completed_at DESC`,
      mapped via `rowToEntry`/`checkNick` reused from `src/lib/gallery.ts`.
- [x] Exported `GalleryRow` (type) and `rowToEntry` from `gallery.ts` — minimal
      change; the profile page is the only new consumer. P3 gallery integration also
      benefits.
- [x] Render handle title, total count, honorific breakdown (seal colors reused),
      diploma grid → `/v/{id}`. Empty state (dry es-ES) when no listed diplomas.
- [x] OG/canonical meta; indexable. `noIndex={true}` only on the 404 variant.
      No `display_name`/`email` anywhere in the template.
- [x] Gate green.

## P3 — Gallery counter + opt-in UI + privacy
- [ ] Extend `GalleryEntry` (`src/lib/gallery.ts`) with `profileHandle: string|null`
      and `siblingCount: number`.
- [ ] `queryGallery`: LEFT JOIN `accounts` on `cards.account_id`; set
      `profileHandle` only when `profile_public=1 AND public_handle IS NOT NULL`;
      compute the account's listed-completed count.
- [ ] `/galeria` entry UI: when `profileHandle` set, show "N bingos del mismo jugador"
      → `/jugador/{handle}` (link without inflated counter when `siblingCount===1`).
- [ ] `index.astro` account bar: "Perfil público" control — create (handle input +
      activar), edit, disable toggle; inline typed-error copy; a11y (`aria-live`,
      labelled input, focus).
- [ ] `/privacidad`: opt-in public-profile subsection (handle not real name, how to
      disable, consent basis, hidden-diploma note).
- [ ] Gate green.

## P4 — Hardening + review
- [ ] Companion reviews: code-review, security-review, verify, tech-debt; design-review,
      accessibility-review, brand-review; web-perf + SEO.
- [ ] Manual dev-scenario pass — all rows in SPEC "Dev scenarios", emphasis on
      `profile:no-realname`, `profile:private-404`, `profile:hidden-diploma`,
      `profile:handle-taken`, `gallery:counter`.
- [ ] Resolve/track findings (fix-now folded; postpone → issue).

## P5 — PR
- [ ] Branch `feat/09-gallery-profiles`; one PR vs `main`.
- [ ] English body; `Closes #<issue>`; flag migration `0013` for the deployer.
- [ ] Gate green.

## Tracking
- [ ] Create the GitHub issue for this feature; record issue/PR numbers here.
- [ ] Confirm `03` corrected to `done` and `09` deps (`03`, `05`) both merged in ROADMAP.
- [ ] Confirm the three default decisions (D1 opt-in, D2 handle, D3 handle-as-label)
      with the owner before P1, or proceed on the documented defaults.
