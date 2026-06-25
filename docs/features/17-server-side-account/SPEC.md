# Feature 17 — server-side-account

## Goal

Eliminate the client-side `GET /api/account` fetch that fires on every page load.
Currently `initAccountBar()` calls `fetchAccount()` → `GET /api/account`, which
produces a browser-logged 401 for every unauthenticated visitor and adds a round-trip
to the account bar render. Replace it with:

1. Server-side session + account read in `index.astro` frontmatter (already SSR).
2. Inline the account data as JSON so the client script reads it with zero network
   round-trips.
3. Extract the account bar HTML into `AccountBar.astro` rendered with `server:defer`,
   so the initial HTML already reflects the correct logged-in / logged-out state
   (no FOUC, no hidden-then-reveal flash).

## Size

S

## Dependencies

None.

## Scope

### In scope

1. **`index.astro` frontmatter** — call `getSession` + D1 account query if session
   exists; serialize result into a `<script type="application/json" id="ev-account">`
   tag (null when logged out).
2. **`AccountBar.astro`** (new) — extracts the `#account-bar` HTML from
   `SiteNav.astro`; reads session server-side; renders the correct initial state
   (logged-out provider buttons vs logged-in chip); used with `server:defer` in
   `index.astro` so it doesn't block the initial HTML response.
3. **`initAccountBar()` in `index.astro` client script** — remove `fetchAccount()`
   call; read from `#ev-account` JSON tag instead; rest of the function (logout,
   profile control, link-card flow, conflict dialog) unchanged.
4. **`SiteNav.astro`** — remove the `#account-bar` block (moved to
   `AccountBar.astro`).
5. **`GET /api/account` endpoint** — kept; still needed for `DELETE /api/account`
   (GDPR erasure) and any future feature that needs to refresh account data
   client-side.

### Out of scope

- Moving conflict dialog / link-card flow to server-side (intertwined with game
  state — client-only).
- Removing `GET /api/account` endpoint.
- SSR of the full game page (offline-first architecture is unchanged).
- Other pages (`c/[id].astro`, `v/[id].astro`, `g/[id].astro`) — only `index.astro`
  uses the account bar interactively today.

## Architecture notes

`server:defer` in Astro 7 renders the component in a second request after the
initial page response, using a `slot="fallback"` placeholder in the meantime.
The deferred component runs in the Worker like any other SSR page — it has access
to `env.DB` and cookies via `Astro.request`. No new dependencies required.

The inline JSON approach (`<script type="application/json">`) is a standard SSR
pattern: the tag is not executed by the browser, the client script parses it with
`JSON.parse(document.getElementById('ev-account').textContent)`. This is XSS-safe
as long as the serialized value is produced by `JSON.stringify` (which escapes `<`,
`>`, `&` as Unicode escapes) — same guarantee as the existing JSON-LD `set:html`
block.

## Acceptance criteria

- [ ] `GET /api/account` no longer appears in the browser network panel on page load.
- [ ] Logged-out visitors: no 401 console error; account bar stays hidden (or shows
      provider login buttons if OAuth is configured).
- [ ] Logged-in visitors: account bar shows correct name + chip server-side on first
      paint, no flash of logged-out state.
- [ ] Logout, profile form, link-card flow, and conflict dialog all work as before.
- [ ] `npm run build` green.

## Phases

### P1 — inline JSON + remove client fetch

1. Add session + account read to `index.astro` frontmatter.
2. Inject `<script type="application/json" id="ev-account">` into the page.
3. Replace `fetchAccount()` call in `initAccountBar()` with DOM read.
4. Gate: build green, 401 gone from network panel in dev.

### P2 — AccountBar component + server:defer

1. Create `src/components/AccountBar.astro`; move `#account-bar` HTML from
   `SiteNav.astro`; add frontmatter session read + conditional rendering.
2. Replace the inline `#account-bar` in `SiteNav.astro` with
   `<AccountBar server:defer>` (with an invisible fallback).
3. Verify: correct server-rendered initial state, no FOUC, interactivity preserved.
4. Gate: build green.
