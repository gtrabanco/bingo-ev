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
(`src/pages/index.astro:1542`). The branch serves a dual purpose:

1. **Intentional pass-through** — `src/pages/api/account/profile.ts:56` returns
   `BLOCK_MESSAGES[check.reason]` as the error value (pre-localised Spanish strings
   such as `"Nombre reservado"`). The client comment at line 1534 notes this
   explicitly. The `else` was designed to surface these strings.
2. **Unguarded catch-all** — any genuinely unexpected token (e.g. `"failed"`,
   `"invalid_body"`) is also passed through verbatim instead of being replaced
   with a generic Spanish fallback.

Because `BLOCK_MESSAGES` is a server-side module and the `saveProfile` logic lives
in a client `<script>` block, the fix cannot import and compare against that map.
The two kinds of value are distinguished by shape: machine-code tokens are
lowercase snake\_case (`/^[a-z_]+$/`); Spanish display strings contain uppercase
letters and spaces.

## Scope

### In scope

- Split the `else` into two branches distinguished by shape:
  - machine-code token (`/^[a-z_]+$/`) → generic Spanish fallback + `console.error`.
  - other (pre-localised display string, e.g. blocklist message) → pass through to `showProfileError`.
- `console.error` the raw value for any unrecognised machine-code token.

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

- [ ] A simulated unexpected machine-code token (e.g. `"internal_error"`) shows the
      Spanish fallback in the UI, not the raw token.
- [ ] The raw machine-code token is logged to `console.error`.
- [ ] A blocklist message (e.g. `"Nombre reservado"`) is shown verbatim — not replaced
      by the generic fallback.
- [ ] All three existing mapped codes (`handle_invalid`, `handle_taken`, `offline`) are
      unchanged.
- [ ] `npm run build` passes.

## Rollback

Revert the one-line change. No data-side cleanup needed.

## Effort

XS — single-line substitution plus a `console.error` call.
