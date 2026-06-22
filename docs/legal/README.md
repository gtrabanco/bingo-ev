# Legal & compliance

## Applicable regulations

- **GDPR (EU)** — the product collects email addresses (card recovery + optional
  newsletter), so it must honor lawful basis, consent, transparency, retention, and data
  subject rights. Public page: `/privacidad` (`src/pages/privacidad.astro`).
- **Controller**: Gabriel Trabanco · contact `hola@gtrabanco.com`. Update both in
  `/privacidad` if they change.

## Data & privacy

- **Personal data collected**: email (only with the user's action), tied to a card for
  recovery and, if explicitly opted in, the newsletter. `nick`/`alias` are user-chosen
  display labels, not verified identity.
- **Lawful basis**: consent. The newsletter checkbox is **explicit and unticked**.
  The `cards` table stores a `newsletter` boolean (records opt-in preference at
  registration time). A double opt-in confirmation email is sent automatically by
  the gtrabanco.com newsletter service (`@gtrabanco/newsletter`) — the subscription
  is not active until the user clicks the link in that email.
- **No analytics or advertising cookies.** Game state is `localStorage` only (strictly
  necessary) → no cookie banner required.
- **Retention**: the registry is kept deliberately tiny — regenerated/expired
  never-completed cards are deleted; completed cards persist until the account
  owner invokes the "Borrar todo" erasure path, which deletes diplomas too (see
  `DELETE /api/account` — feature 13).
- **Rights**: users can request deletion (contact above). Newsletter subscriber data
  is managed externally by the gtrabanco.com newsletter service (the D1 `newsletter`
  table was dropped in migration `0015_drop_newsletter_table.sql`); deletion requests
  for newsletter data must be forwarded to that service.

## Implementation touchpoints

- **Email collection forms** (`index.astro`): a disclaimer at the point of collection
  linking to `/privacidad`; the consent checkbox starts unticked.
- **Brevo** is used **only** for the transactional recovery email — never for the
  newsletter. Keep that boundary.
- **Cloudflare Turnstile** guards 4 creation/email endpoints (`POST /api/cards`,
  `/api/recover`, `/api/groups`, `/api/groups/:id/join`). Cookieless; no tracking
  cookies. Cloudflare acts as data processor for connection signals during verification.
  Disclosed in `/privacidad` under "Protección contra bots". Secret key via
  `wrangler secret put TURNSTILE_SECRET_KEY`; site key via `PUBLIC_TURNSTILE_SITE_KEY`
  build-time env var (CF Workers Builds dashboard for production).
- **Google and X (Twitter)** are processors for social OAuth login (feature 05).
  Data received: provider user id, display name, email (if returned — X may omit it).
  Purpose: creating a durable identity to aggregate diplomas across devices.
  Lawful basis: consent (the user actively clicks "Continuar con Google/X").
  Retention: until the user invokes "Borrar todo" via `DELETE /api/account`
  (feature 13), which hard-deletes the account and all linked cards including
  completed diplomas.
  Provider tokens are **not stored** — used once at callback, then discarded.
  Disclosed in `/privacidad` under "Cuentas e inicio de sesión".
  Secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
  `X_OAUTH_CLIENT_ID`, `X_OAUTH_CLIENT_SECRET` via `wrangler secret put`.
- **Session cookie** (`evbingo_session`): `HttpOnly; Secure; SameSite=Lax; Path=/`.
  Strictly necessary (authentication only, not tracking). Set on OAuth callback,
  cleared on logout. Only the SHA-256 hash of the token is stored in D1 (`sessions`
  table); the raw token cannot be reconstructed from DB. Expires after 90 days.
  Cookie is **not set** when the user is not logged in — no cookie banner needed
  (ePrivacy strictly-necessary exemption); but the "no cookies" claim in
  `/privacidad` has been corrected to clarify this.
- **No brand names** anywhere in copy or situations (editorial/legal hygiene — avoids
  implying any real company). **Exceptions:** vehicle-type selector (user self-identification
  data, not editorial copy); "Continuar con Google/X" login buttons (functional auth UI,
  legally analogous to the vehicle-brand selector — not editorial game copy).
- **Tesla referral** copy must not imply unequal benefit ("ganamos los dos por igual").
- Any new field that stores personal data must be reflected in `/privacidad` (purpose,
  basis, retention) before shipping.
