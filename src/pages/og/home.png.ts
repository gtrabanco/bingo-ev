// PNG wrapper for the home OG image.
//
// Social networks (X/Twitter, Facebook, WhatsApp, LinkedIn) reject SVG as
// og:image. This endpoint self-fetches /og/home.svg with the Cloudflare Image
// Resizing extension (cf.image) to get a PNG on the way back.
//
// Falls back to serving the SVG directly in local dev (blocked by
// global_fetch_strictly_public) and on plans without Image Resizing.
// That is the pre-feature state — no regression if CF Image Resizing is off.
export const prerender = false;

import type { APIRoute } from 'astro';
import { homeSvg } from '../../lib/og-image';

export const GET: APIRoute = async ({ request }) => {
  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = '/og/home.svg';

    const resp = await fetch(svgUrl, {
      // cf is a Cloudflare Workers extension to RequestInit.
      cf: { image: { format: 'png', width: 1200, height: 630 } },
    } as unknown as RequestInit);

    if (resp.ok && resp.headers.get('content-type')?.startsWith('image/png')) {
      return new Response(resp.body, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=86400, immutable',
        },
      });
    }
  } catch {
    // Local dev or Image Resizing unavailable — fall through to SVG.
  }

  return new Response(homeSvg(), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
