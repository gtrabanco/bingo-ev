# fix/20-script-crash-conditional-elements

## Goal

`src/pages/index.astro` crashes its entire client `<script>` block when any OAuth
provider env var is absent, because it calls `$()` — which throws on a missing
element — on three elements that are conditionally rendered by the server. The crash
silently kills every event listener registered below that point in the file,
including the device-code «Abrir en otro dispositivo» button. Fix by switching those
three declarations to `document.querySelector()`, which returns `null` instead of
throwing.

## Issue

`#20`

## Branch

`fix/20-script-crash-conditional-elements`

## Root cause

`src/pages/index.astro:1453-1457`:

```ts
const accountLoggedOut = $<HTMLDivElement>('#account-loggedout');  // absent when !hasAnyProvider
const btnLoginGoogle   = $<HTMLButtonElement>('#btn-login-google'); // absent when !hasGoogle
const btnLoginX        = $<HTMLButtonElement>('#btn-login-x');      // absent when !hasX
```

`$` is a helper that throws `Error: Missing element: ${selector}` when the selector
matches nothing. These three elements are only emitted by the Astro template when
the corresponding env-var boolean is true (`hasAnyProvider`, `hasGoogle`, `hasX`).
If any is false (e.g. `GOOGLE_OAUTH_CLIENT_ID` not set), `$` throws at **top
level** of the `<script>`, halting execution before any event listener is wired.

The downstream usages of these three variables already use optional chaining (`?.`)
— `accountLoggedOut?.classList.add(...)`, `btnLoginGoogle?.addEventListener(...)` —
so `null` is already a handled value everywhere they are consumed. Only the
declarations are wrong.

## Scope

### In scope

- `src/pages/index.astro`: change the three `$()` declarations on lines 1453, 1456,
  and 1457 to `document.querySelector()`.
- `src/pages/api/cards/[id]/device-code.ts`: correct `CONTROL_CHARS` regex from
  `/[ -]/g` to `/[\x00-\x1f\x7f]/g` (hard-convention violation found during
  analysis — bundled as a two-line fix in the same commit).

### Out of scope

- The `aria-labelledby` accessibility issue on the conflict dialog (`#18`) — already
  tracked separately.

## Impact

- Files touched: `src/pages/index.astro`, `src/pages/api/cards/[id]/device-code.ts`
- Blast radius: the `accountLoggedOut` variable may now be `null` at the declaration
  site, but every usage already guards with `?.` — no new null paths introduced.
- Detection lead time: immediate on any deployment where an OAuth provider is not
  configured.

## Rules that must never be violated

- No new runtime dependencies.
- `npm run build` must pass (gate).
- Hard convention: `CONTROL_CHARS` must be `/[\x00-\x1f\x7f]/g` across the codebase.

## Risks

- Security: n/a (no auth changes; `document.querySelector` is a read-only DOM query).
- Compliance: n/a.
- Data: n/a.

## Acceptance criteria

- [ ] Clicking «Abrir en otro dispositivo» shows the device-code dialog, regardless
  of whether `GOOGLE_OAUTH_CLIENT_ID` / `X_OAUTH_CLIENT_ID` are configured.
- [ ] The account bar behaves normally when at least one OAuth provider is configured.
- [ ] `npm run build` passes with no type errors.
- [ ] `CONTROL_CHARS` in `device-code.ts` matches `/[\x00-\x1f\x7f]/g`.

## Rollback

Revert the PR. No DB migration; no data-side cleanup needed.

## Effort

XS — three one-line declarations changed; one regex constant corrected.
