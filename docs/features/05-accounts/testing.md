# 05 — accounts · Testing

## Manual scenarios (require provider test credentials in `.dev.vars`)

Register OAuth apps with Google and X; add to `.dev.vars`:
```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
X_OAUTH_CLIENT_ID=...
X_OAUTH_CLIENT_SECRET=...
```
Register `http://localhost:4321/api/auth/google/callback` and
`http://localhost:4321/api/auth/x/callback` as allowed redirect URIs.

| Scenario | Steps |
|---|---|
| `auth:google-login` | Click "Continuar con Google" → Google consent → lands at `/` logged in |
| `auth:x-login` | Click "Continuar con X" → X consent → lands at `/` (email null is ok) |
| `auth:returning` | Log out, log in again same provider → no duplicate `accounts` row |
| `auth:link-card` | After login, check `cards.account_id` set for the current card |
| `auth:create-logged-in` | While logged in, start a new card → `account_id` set at creation |
| `auth:logout` | Click "Cerrar sesión" → session cookie cleared, account bar shows login |
| `auth:account-delete` | Call `DELETE /api/account` → account gone, cards survive with `account_id = NULL` |
| `auth:csrf` | Hand-craft callback with wrong `state` → 400, no session set |
| `auth:open-redirect` | Append `?redirect=https://evil.example` to callback URL → lands at `/` only |
| `auth:degraded` | Stop Worker → login fails gracefully, game still playable |

## Security review (mandatory — run /security-review before PR)

Surface to review:
- CSRF/state: single-use DELETE in `consumeOauthState`
- PKCE: `code_verifier` in `oauth_state`, `code_challenge_method=S256`
- Cookie flags: `HttpOnly; Secure; SameSite=Lax; Path=/`
- Open-redirect: hardcoded `Location: /` in callback
- Token persistence: `accessToken` never stored, only `sha256(token)` in sessions
- Secret re-check: `link-card` guarded `UPDATE ... AND (secret = ? OR secret IS NULL)`
- Session rotation: `issueSession` generates a fresh token every login
- Rate-limit: `RATE_LIMITER_AUTH` on `/start` and `/callback`
- `consumeOauthState` age check vs DB clock (uses `created_at > ?` with ISO string)
