# 03 — public-gallery · TASKS

> Concrete checklist per phase. Check off as completed during `execute-phase`.
> Gate = `npm run build` green before each commit.

## P1 — Schema + read API
- [ ] `migrations/0010_gallery.sql` adds `gallery_hidden INTEGER NOT NULL DEFAULT 0`.
- [ ] Apply locally: `npx wrangler d1 migrations apply ev-bingo --local`.
- [ ] `src/pages/api/gallery.ts`: `export const prerender = false`, `import { env }
      from 'cloudflare:workers'`.
- [ ] SQL: `completed_at IS NOT NULL AND gallery_hidden = 0`, optional `vehicle_type
      = ?`, `ORDER BY completed_at DESC`, bounded `LIMIT/OFFSET` over-fetch.
- [ ] Worker computes honorific per row via `honorificFor(cells, marks)`; applies
      honorific filter; suppresses wordlist-matching nicks; builds total + counts.
- [ ] Response shape `{ items, total, counts: { honorific, vehicle }, hasMore }`;
      `GalleryEntry = { id, nick, completedAt, honorific, vehicleType }` — **no
      marks/cells**.
- [ ] Validate/clamp `page`, `honorific`, `vehicle` query params; cap limit/offset.
- [ ] `src/lib/api.ts`: `fetchGallery(params)` + types; degrade to empty on
      timeout/failure (4 s `AbortSignal.timeout`).
- [ ] Gate; manual endpoint check (filters on/off; payload has no marks/cells).

## P2 — Gallery page
- [ ] `src/pages/galeria.astro` (`prerender = false`) server-renders first page.
- [ ] Entry card: honorific seal + tier label (reuse `certificate-design.ts`), nick
      or fallback, completion date, vehicle_type when set; links to `/v/{id}`.
- [ ] Total + per-filter counts displayed.
- [ ] Client filter controls (honorific, vehicle) + pagination via `fetchGallery`.
- [ ] Empty state copy (es-ES, dry tone).
- [ ] SEO: title/description/OG per `docs/frontend/SEO.md`; add `/galeria` to sitemap.
- [ ] Gate; Preview-MCP pass: populated / empty / filtered / degraded.

## P3 — Owner hide + moderation + privacy
- [ ] `src/pages/api/cards/[id]/gallery.ts` (`POST`, `prerender = false`): verify
      exists + completed + secret matches; set `gallery_hidden` from `{hidden}`.
- [ ] `src/lib/api.ts`: `setGalleryHidden(id, secret, hidden)` → `false` on failure.
- [ ] `index.astro`: accessible hide/unhide toggle on owner's completed-card view,
      reflecting current state, using stored secret.
- [ ] `src/data/blocklist.json` with two categories: `reserved` (owner-name-similar:
      "gabriel", "trabanco", "gtrabanco", "gruxon", …) and `nsfw` (es-ES slurs/profanity).
- [ ] `src/lib/blocklist.ts`: `checkNick(nick)` returns
      `{ blocked: false } | { blocked: true, reason: 'reserved' | 'nsfw' | 'pattern' }`.
      Evaluation order:
      1. Pattern checks (on raw nick, no normalization):
         - `/@/` → `reason: 'pattern'` (`"Nombre no permitido"`)
         - `/\.[a-z]{2,}(\/|$)/i` → `reason: 'pattern'` (`"Nombre no permitido"`)
      2. Wordlist checks (on normalized nick: trim → lowercase → NFD → strip diacritics):
         - `reserved` terms → `reason: 'reserved'` (`"Nombre reservado"`)
         - `nsfw` terms → `reason: 'nsfw'` (`"Nombre inapropiado"`)
- [ ] Verify the domain regex does NOT reject innocent dots: "Sr. Sufridor", "J.A.",
      "Señor.Triste" (dot not followed by ≥2 letters + boundary).
- [ ] Apply blocklist at write time in `POST /api/cards/[id]/complete`: test nick
      before `UPDATE`; return 422 `{ error: "Nombre reservado" }` or
      `{ error: "Nombre inapropiado" }` without saving the nick and without
      blocking the win (`completed_at` is still set).
- [ ] Confirm P1 gallery endpoint consumes the same check at read time (fallback
      suppression for pre-existing matching nicks).
- [ ] `src/pages/privacidad.astro`: gallery section — purpose (discoverability of
      completed diplomas), opt-out, how to hide, blocklist reason ("reservamos
      algunos nombres para garantizar la integridad del sitio"), takedown contact
      `hola@gtrabanco.com`.
- [ ] Gate; manual hide/unhide round-trip + blocked-nick suppression.

## P4 — Hardening + review
- [ ] `code-review`, `security-review`, `verify`, `tech-debt`.
- [ ] `design-review`, `accessibility-review`, `brand-review` (tone + no-brand-names).
- [ ] `web-perf` + SEO skill.
- [ ] Walk all `Dev scenarios` (`gallery:populated|empty|hidden|blocked-nick|degraded|
      filtered`).
- [ ] Resolve or track every finding (no silent skips).

## P5 — PR
- [ ] Branch `feat/03-public-gallery`; one PR against `main`.
- [ ] English PR body; `Closes #<issue>`; flag the migration for reviewers.
- [ ] Gate green; merge when standalone-valuable and reviewed.

## Tracking
- [ ] Create the GitHub issue for this feature; record its number in the PR body.
- [ ] Confirm roadmap entry `09 gallery-profiles` exists (deferred profile/counter).
