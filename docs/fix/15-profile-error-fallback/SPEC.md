# fix/15-profile-error-fallback

## Goal

The `saveProfile` catch-all `else` branch in `src/pages/index.astro` renders the
raw `result.error` token directly in the UI. Any unmapped error code (a future
endpoint code, a partial-JSON network response, etc.) would surface an English
technical string to the user instead of a localised Spanish message.

## Issue

`#15`

## Branch

`fix/15-profile-error-fallback`

## Root cause

`saveProfile` maps three known error codes to Spanish copy, but the final `else`
branch calls `showProfileError(result.error)` verbatim
(`src/pages/index.astro:1542`). The value is whatever the server or network
returned — untranslated, uncontrolled.

## Scope

### In scope

- Replace `showProfileError(result.error)` with a generic Spanish fallback string.
- `console.error` the raw value so it remains debuggable.

### Out of scope

- Adding new error code mappings (no new codes exist today).
- Refactoring the error-map pattern into a lookup table (unrelated cleanup).

## Impact

- Files touched: `src/pages/index.astro` (1 line change).
- Blast radius: only the profile-save error path; no other flow shares this branch.
- Detection lead time: immediately visible on any unexpected server response.

## Rules that must never be violated

- UI strings must be in Spanish (es-ES) with a dry-sarcastic tone; no brand names.
- No new runtime dependencies.

## Risks

- **Operational:** none — the fallback is defensive; it replaces an already-broken UX path.
- **Security:** n/a — no user input is echoed; the raw value is only logged to console.
- **Compliance:** n/a.

## Acceptance criteria

- [ ] A simulated unexpected error code (e.g. `"internal_error"`) shows the Spanish
      fallback in the UI, not the raw token.
- [ ] The raw value is logged to `console.error`.
- [ ] All three existing mapped codes (`handle_invalid`, `handle_taken`, `offline`) are
      unchanged.
- [ ] `npm run build` passes.

## Rollback

Revert the one-line change. No data-side cleanup needed.

## Effort

XS — single-line substitution plus a `console.error` call.
