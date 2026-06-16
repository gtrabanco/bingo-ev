// PNG wrapper for the OG diploma image.
//
// Social networks (Twitter/X, Facebook, LinkedIn, WhatsApp) reject SVG as
// og:image. This endpoint generates the SVG inline, then asks Cloudflare
// Image Resizing to convert it to PNG via a self-fetch (cf.image extension).
//
// Requires Cloudflare Image Resizing to be enabled on the zone. In local dev
// the self-fetch is blocked by the global_fetch_strictly_public flag, so the
// endpoint falls back to serving the SVG — the same graceful path used when
// Image Resizing is not available on the plan.
export const prerender = false;

import type { APIRoute } from 'astro';
import { loadDiplomaData, ID_PATTERN } from '../../../lib/og-diploma';
import { diplomaSvg } from '../../../lib/og-image';

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const data = await loadDiplomaData(id);
  if (!data) return new Response(null, { status: 404 });

  const svg = diplomaSvg(data);

  // Try Cloudflare Image Resizing: self-fetch the SVG sibling with cf.image
  // so CF converts it to PNG on the way back. Fails in local dev
  // (global_fetch_strictly_public blocks localhost) and on plans without
  // Image Resizing — both are caught and fall through to the SVG fallback.
  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = `/og/diploma/${id}.svg`;

    const resp = await fetch(svgUrl, {
      // cf is a Cloudflare Workers extension to RequestInit.
      cf: { image: { format: 'png', width: 1200, height: 630 } },
    } as unknown as RequestInit);

    if (resp.ok && resp.headers.get('content-type')?.startsWith('image/png')) {
      return new Response(resp.body, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
  } catch {
    // Local dev or Image Resizing unavailable — fall through to SVG.
  }

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
