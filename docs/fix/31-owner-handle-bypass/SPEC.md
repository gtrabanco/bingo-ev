# fix/31-owner-handle-bypass

## Goal

The account that owns the OAuth apps (Google/X) is subject to the same handle
blocklist that applies to all users. The owner needs to be able to use any handle
— including reserved or nsfw terms — without rejection. Cannot wait for a feature
cycle because it blocks the owner from setting up their own public profile.

## Issue

`#31`

## Branch

`fix/31-owner-handle-bypass`

## Root cause

`POST /api/account/profile` (`src/pages/api/account/profile.ts:37-39`) calls
`checkNick(handle)` unconditionally for every authenticated account. There is no
path that skips this check for the service owner.

X OAuth does not expose the user's email (`src/lib/auth.ts:401-407`), so owner
identification must be split: email for Google, `provider_user_id` for X.

## Scope

### In scope

1. Two new optional env vars: `OWNER_EMAIL` and `OWNER_X_USER_ID`.
2. In `POST /api/account/profile`, after resolving the session, do a single
   `SELECT email, provider, provider_user_id FROM accounts WHERE id = ?`.
3. Derive `isOwner`:
   - `provider === 'google'` and `email === env.OWNER_EMAIL` (when set), OR
   - `provider === 'x'` and `provider_user_id === env.OWNER_X_USER_ID` (when set).
4. If `isOwner`, skip the `checkNick` call; all other validation still runs
   (`HANDLE_RE` format + uniqueness).
5. Document both vars in `.dev.vars` (local placeholder comments) and confirm
   they are set via `npx wrangler secret put` in production.

### Out of scope

- Admin UI or any visual indicator of owner status.
- Elevating owner privileges beyond the handle check (e.g. moderating other profiles).
- A general role/permission system.

## Impact

- **Files touched:** `src/pages/api/account/profile.ts` (one extra DB SELECT,
  conditional guard around `checkNick`).
- **Blast radius:** if the SELECT is wrong or env vars are misread, the owner
  still gets rejected (same as today) — no regression for normal users.
- **Detection:** immediate on the next profile-set attempt.

## Rules that must never be violated

- `env` must come from `import { env } from 'cloudflare:workers'` — never
  `locals.runtime.env`.
- `prerender = false` already set; must remain.
- No new runtime dependencies.
- Input sanitization still runs: `normalizeHandle` + `HANDLE_RE` check always
  execute regardless of owner status.

## Risks

- **Security:** the bypass is keyed to env vars, not hardcoded values. If
  `OWNER_EMAIL` is leaked, it only exposes the owner's email, which is already
  visible to anyone who controls the Google OAuth project. Risk: low.
- **X email gap:** X does not expose email; `OWNER_X_USER_ID` must be the numeric
  provider user ID from the X developer portal, not the @handle (which can change).
- **Compliance / GDPR:** no new personal data stored; env vars are configuration,
  not user data. n/a.

## Acceptance criteria

- [ ] Owner Google account can set a handle that `checkNick` would normally reject
      (`reserved`, `nsfw`, `pattern`) and receives `204`.
- [ ] Owner X account (identified by `OWNER_X_USER_ID`) can do the same.
- [ ] A non-owner account with the same handle attempt still receives `422`.
- [ ] Format validation (`HANDLE_RE`) still rejects handles outside `[a-z0-9-]{3,24}`
      even for the owner.
- [ ] Uniqueness constraint still applies to the owner (409 if taken).
- [ ] If neither `OWNER_EMAIL` nor `OWNER_X_USER_ID` is set, behaviour is
      unchanged: blocklist applies to everyone.
- [ ] `npm run build` green.

## Rollback

Remove `OWNER_EMAIL` and `OWNER_X_USER_ID` from Cloudflare secrets and redeploy.
No DB changes; no data-side cleanup.

## Effort

XS — one file, one extra SELECT, one conditional guard.
