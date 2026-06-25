# fix/72-og-png-resvg-wasm

## Goal

All four OG PNG endpoints (`/og/home.png`, `/og/home-story.png`, `/og/diploma/{id}.png`,
`/og/diploma/{id}-story.png`) return `image/svg+xml` in production. Social networks
(X, Facebook, WhatsApp, LinkedIn) silently reject SVG as `og:image`, so link previews
show no image. Replace the broken CF Image Resizing approach with in-process
SVG→PNG conversion via `@resvg/resvg-wasm`.

## Issue

`#72` — tracked issue. The PR closes it.

## Branch

`fix/72-og-png-resvg-wasm`

## Root cause

All four endpoints use a CF Image Resizing self-fetch pattern:
```ts
fetch(svgUrl, { cf: { image: { format: 'png', width, height } } })
```
CF Image Resizing is not enabled on this plan. The `cf` extension is silently ignored,
the fetch returns SVG, the `content-type: image/png` guard fails, and the fallback
serves SVG. Confirmed: `curl -sI https://bingo.gruxon.com/og/home.png` →
`content-type: image/svg+xml`.

## Scope

### In scope

1. Add `@resvg/resvg-wasm` as an approved runtime dependency (WASM-based, workers-safe,
   no transitive runtime deps — approved exception like `uqr`).
2. Add `src/lib/svg-to-png.ts` — lazy WASM init singleton + `svgToPng(svg, w, h)` helper.
3. Rewrite all four PNG endpoints to call `svgToPng` instead of the CF self-fetch.
   Remove the CF self-fetch and the SVG fallback; keep only the WASM PNG path.
4. Update `CLAUDE.md` approved-exceptions line.

Affected files: `src/lib/svg-to-png.ts` (new), `src/pages/og/home.png.ts`,
`src/pages/og/home-story.png.ts`, `src/pages/og/diploma/[id].png.ts`,
`src/pages/og/diploma/[id]-story.png.ts`, `CLAUDE.md`, `package.json`.

### Out of scope

- The SVG source generation (`og-image.ts`) — unchanged.
- Custom font embedding in the rasterized PNG (SVG ships as system-default fallback;
  revisit if font rendering is unsatisfactory in the real output).
- `home-story.png` / `diploma/{id}-story.png` — same fix applies; covered here.

## Impact

- Runtime dependency: `@resvg/resvg-wasm` — WASM binary ~2.5 MB uncompressed, bundles
  into the Worker. Workers Paid 10 MB script limit applies; acceptable given D1 use.
- WASM is lazy-initialized once per Worker instance (cold-start cost ~20–50 ms, then
  cached in the instance memory for the lifetime of the isolate).
- SVG fallback is removed. PNG is always produced or the endpoint returns 500.
- First request per Worker instance fetches BricolageGrotesque (~205 KB) from the
  origin URL; the buffer is then cached in module scope for the isolate lifetime.
  Lora is decoded from the existing base64 subset in `og-fonts.ts` (no fetch).

## Decisions

**D1 — Rejected-promise caching in `ensureReady`.**
If `initWasm` or the font fetch throws, `ready` is set to the rejected promise and
remains so for the lifetime of the isolate — all subsequent requests to any PNG
endpoint immediately reject too. This is intentional: a failure at this level
(WASM bundling broken, font asset missing) is deterministic, not transient. Retrying
every request would just add latency to an unrecoverable state; the isolate will be
recycled on the next deploy. See [#74](https://github.com/gtrabanco/bingo-ev/issues/74)
for the version-pin follow-up.

**D2 — No SVG fallback.**
The old code fell back to SVG on CF Image Resizing failure. The new code removes that
fallback: if `svgToPng` throws the endpoint returns 500. Social crawlers handle 500s
gracefully (they omit the image; the link card still shows title/description).
Returning SVG and pretending it is a PNG would be misleading and still not render
on X/WhatsApp. The explicit 500 is the correct failure mode.

## Rules

- `export const prerender = false` on all dynamic endpoints — unchanged.
- No `locals.runtime.env` — not needed here.
- `@resvg/resvg-wasm` added to the approved-exceptions list in `CLAUDE.md`.

## Risks

- **WASM bundle size** — adds ~2.5 MB uncompressed. Workers Paid limit is 10 MB.
  Risk: low (project is already on Workers Paid for D1 + rate limiting).
- **WASM cold-start latency** — first request per isolate pays ~20–50 ms init.
  Risk: low (OG images are background fetches by crawlers, not user interactions).
- **Font rendering** — `@resvg/resvg-wasm` requires font buffers; Workers has no system
  fonts. Resolved: Lora decoded from existing base64 subset in `og-fonts.ts`; Bricolage
  Grotesque fetched from `${origin}/fonts/BricolageGrotesque-variable.woff2` on first
  isolate request, cached in module scope. Both passed as `fontBuffers` to `Resvg`.
  Risk: low (font asset must exist at `/fonts/` — it does, self-hosted in `public/fonts/`).

## Acceptance criteria

- [ ] `GET /og/home.png` → `content-type: image/png` in production. — manual/curl
- [ ] `GET /og/home-story.png` → `content-type: image/png` in production. — manual/curl
- [ ] `GET /og/diploma/{id}.png` → `content-type: image/png` for a real card. — manual
- [ ] Link preview on X shows the OG image card with the bingo grid. — manual
- [x] `npm run build` green. — gate

## Effort

S — four near-identical endpoints, one shared helper, one dep addition.
