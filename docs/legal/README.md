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
- **Lawful basis**: consent. The newsletter checkbox is **explicit and unticked**;
  `consented_at` records the timestamp. No confirmation email is sent — the form is the
  confirmation.
- **No analytics or advertising cookies.** Game state is `localStorage` only (strictly
  necessary) → no cookie banner required.
- **Retention**: the registry is kept deliberately tiny — regenerated/expired
  never-completed cards are deleted; completed cards persist so diplomas stay verifiable.
- **Rights**: users can request deletion (contact above). The newsletter list lives in
  the project's own D1 (`newsletter` table), not a third party.

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
- **No brand names** anywhere in copy or situations (editorial/legal hygiene — avoids
  implying any real company).
- **Tesla referral** copy must not imply unequal benefit ("ganamos los dos por igual").
- Any new field that stores personal data must be reflected in `/privacidad` (purpose,
  basis, retention) before shipping.
