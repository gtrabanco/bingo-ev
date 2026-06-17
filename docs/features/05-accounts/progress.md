# 05 — accounts · Progress

## P1 — Schema + session primitive ✅

- `migrations/0011_accounts.sql`: tables `accounts`, `sessions`, `oauth_state`;
  nullable `cards.account_id` column. Applied locally.
- `src/lib/auth.ts`: crypto helpers (`randomHex`, `sha256Hex`, `base64url`),
  PKCE generation (`generatePkce`), session issue/read/revoke with opportunistic GC,
  oauth_state create/consume, account upsert, provider config record for Google + X.
- Gate green (`npm run build`). No new runtime deps.

**Left open for P2:** HTTP endpoints, cookie Set-Cookie, redirect flow (Google).
