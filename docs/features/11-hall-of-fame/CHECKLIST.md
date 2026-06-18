# Feature 11 — hall-of-fame: completion checklist

## Gate

- [x] `npm run build` passes (Astro type-check + Cloudflare adapter)

## Scope vs SPEC

- [x] Top navbar above `<header>` with "Navegación principal" aria-label
- [x] "Hall of Fame" link on the left → `/hall-of-fame`
- [x] `#device-code-btn` in navbar, labelled "Cambiar de dispositivo" (D1 decision)
- [x] `#device-code-panel` directly below navbar (D3 decision)
- [x] `#account-bar` in navbar (right side), all child ids preserved
- [x] `#account-loggedout` / `#btn-login-google` / `#btn-login-x` — conditional rendering preserved
- [x] Google and X login buttons include SVG logos (carried in here, PR #21 not merged yet)
- [x] `#account-loggedin`, profile control, logout — markup relocated verbatim
- [x] Old standalone `<nav>` (under-header Hall of Fame link) removed
- [x] Old `#device-code-btn` + `#device-code-panel` removed from card management stack
- [x] Navbar wraps with `flex-wrap` on narrow viewports (D2 decision)
- [x] No JS changes — only `$()` → `document.querySelector()` for the three
      conditionally-rendered refs (`#account-loggedout`, `#btn-login-google`,
      `#btn-login-x`) to prevent crash when provider env vars are absent

## Decisions recorded

- **D1** "Cambiar de dispositivo" label — direction-neutral, future-proof for feature 12.
- **D2** flex-wrap (no hamburger menu) — keeps the feature S-sized.
- **D3** `#device-code-panel` directly below navbar — zero JS change.

## Manual verification checklist

These scenarios require a running dev server with appropriate `.dev.vars` state:

| Scenario | How to reach | What to check |
|---|---|---|
| `navbar:logged-out` | providers in `.dev.vars`, no session cookie | Google + X buttons visible in navbar with logos |
| `navbar:no-providers` | remove provider vars, reload | no login buttons, no crash; device-transfer still works |
| `navbar:logged-in` | complete OAuth login | user chip + logout + profile control in navbar |
| `navbar:device-transfer` | card present, click "Cambiar de dispositivo" | `#device-code-panel` opens below navbar with code + QR |
| `navbar:no-card` | clear localStorage, reload | "Cambiar de dispositivo" hidden |
| `navbar:mobile-wrap` | resize to 360px | navbar wraps without overflow |
