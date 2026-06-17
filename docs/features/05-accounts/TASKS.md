# 05 — accounts · TASKS

> Concrete checklist per phase. Check off during `execute-phase`.
> Gate = `npm run build` green before each commit.

## P1 — Schema + session primitive
- [ ] `migrations/0011_accounts.sql`: `accounts` (UNIQUE provider+provider_user_id),
      `sessions` (token_hash PK), `oauth_state` (state PK), `cards.account_id` nullable.
- [ ] Apply locally: `npx wrangler d1 migrations apply ev-bingo --local`.
- [ ] `src/lib/auth.ts`: `generatePkce()` (verifier + S256 challenge via Web Crypto),
      `randomToken()`, `sha256(token)`.
- [ ] `src/lib/auth.ts`: `issueSession(accountId)` → token + DB row (expires +90d);
      `getSession(request)` → `{ accountId } | null` (hash + expiry check);
      `revokeSession(token)`.
- [ ] Opportunistic GC: delete expired `sessions` + `oauth_state` rows, batched into
      auth writes (mirror the card/group GC pattern).
- [ ] No new runtime dependency added to `package.json`.
- [ ] Gate green.

## P2 — Google flow end-to-end
- [ ] Provider config in `lib/auth.ts`: google authorize/token/userinfo URLs,
      scopes (`openid email profile`), env var names.
- [ ] `GET /api/auth/google/start` (`prerender = false`): make state + PKCE, insert
      `oauth_state`, GC, 302 to authorize URL.
- [ ] `GET /api/auth/google/callback`: consume (DELETE) `oauth_state` single-use;
      reject missing/expired/provider-mismatch; exchange code (+verifier); fetch
      userinfo; upsert account; issue session cookie; 302 to `/` (hardcoded origin).
- [ ] `POST /api/auth/logout`: revoke session + clear cookie.
- [ ] Session cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`.
- [ ] Tokens used once then discarded (not stored).
- [ ] Rate-limit `start` + `callback` (`lib/rate-limit.ts`).
- [ ] Gate; manual `auth:google-login`, `auth:returning`, `auth:logout`,
      `auth:csrf`, `auth:open-redirect` (Google test app + `.dev.vars`).

## P3 — X provider
- [ ] X config: authorize/token URLs, `users.read tweet.read` scope, `users/me`
      userinfo; PKCE mandatory.
- [ ] `:provider` routing covers `x`; reject unknown providers.
- [ ] Tolerate absent email (store null); identity = `data.id`.
- [ ] Gate; manual `auth:x-login` (verify null-email path + no duplicate on
      `auth:returning`).

## P4 — Account/card plumbing + minimal UI
- [ ] `POST /api/account/link-card` `{cardId, secret}` (session-auth): atomic
      `UPDATE cards SET account_id=? WHERE id=? AND (secret=? OR secret IS NULL)`.
- [ ] `POST /api/cards`: when `getSession` present, set `account_id` at creation.
- [ ] `GET /api/account` (session-auth): `{ provider, displayName, email, cardCount }`.
- [ ] `DELETE /api/account` (session-auth): delete account + its sessions; null
      `account_id` on its cards (cards survive). No `settleDeparture` impact.
- [ ] `src/lib/api.ts`: `startLogin(provider)` (full redirect), `logout()`,
      `fetchAccount()`, `linkCard(id, secret)`, `deleteAccount()` — degrade to
      `null`/`false`.
- [ ] `index.astro` menu: logged-out → "Continuar con Google" / "Continuar con X";
      logged-in → account indicator + "Cerrar sesión". Accessible (aria, focus).
- [ ] Post-login: client links `localStorage` cards via `linkCard`.
- [ ] Gate; manual `auth:link-card`, `auth:create-logged-in`, `auth:account-delete`,
      `auth:degraded`.

## P5 — Legal + hardening
- [ ] `/privacidad`: new "Cuentas e inicio de sesión" section — processors (Google,
      X), data received (provider id, nombre, email si lo hay), purpose (identidad
      duradera para agrupar tus diplomas), basis (consentimiento), retention (hasta
      borrado de cuenta), deletion right. Correct "no usamos cookies" → cookie de
      sesión estrictamente necesaria solo al iniciar sesión.
- [ ] `docs/legal/README.md`: add Google + X processors + session-cookie touchpoint.
- [ ] Bump `/privacidad` `updated` date.
- [ ] Mandatory `security-review` of the auth surface; resolve/track findings.
- [ ] Gate.

## P6 — PR
- [ ] Branch `feat/05-accounts`; one PR against `main`.
- [ ] English body; `Closes #<issue>`; flag migration `0011` + required secrets
      (`GOOGLE_OAUTH_*`, `X_OAUTH_*`) + redirect-URI registration for the deployer.
- [ ] Gate green.

## Tracking
- [ ] Create the GitHub issue for this feature; record its number in the PR body.
- [ ] Confirm `09 gallery-profiles` still lists `05` as a dependency (it does).
- [ ] Note the deferred "mis diplomas" dashboard as a candidate fast-follow / new
      roadmap row after merge.
