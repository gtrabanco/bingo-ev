# Feature 13 — account-delete-full: completion checklist

- [x] Schema migration — n/a (no schema change)
- [x] Core layer — no outer-layer imports in `lib/groups.ts` (unchanged); `settleDeparture` / `orphanedOwnerRepair` reused as-is
- [x] Endpoint cascade — `DELETE /api/account` hard-deletes cards (active + completed), settles each group departure post-delete, removes sessions + account, runs `orphanedOwnerRepair` backstop
- [x] Completed-card immunity override documented in endpoint comment and SPEC (D1)
- [x] Client helper `deleteAccount()` comment updated (total erasure, not unlink)
- [x] UI — "Borrar todo" button in `#account-loggedin` (logged-out: not visible; no `#account-loggedin` shown)
- [x] UI — native `<dialog>` confirmation with `autofocus` on cancel ("Mejor no"), destructive confirm, `aria-live` error slot
- [x] UI — degraded path: Worker down → error shown, local state NOT cleared, confirm button re-enabled
- [x] UI — success path: `clearCurrentCard()` (storage.ts) clears local card keys, then reload
- [x] UI strings in es-ES, dry-sarcastic, no brand names
- [x] `/privacidad` deletion copy rewritten — total erasure, diplomas removed, GDPR art. 17 cited
- [x] `docs/legal/README.md` — retention note and account deletion note updated
- [x] `npm run build` green (type-check passes)
- [x] No new runtime dependencies
- [x] Flat architecture preserved (only src/{pages,lib} touched)
- [x] `env` from `cloudflare:workers` (not `locals.runtime.env`)
- [x] `prerender = false` on account endpoint (already set, unchanged)
