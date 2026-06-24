// PNG wrapper for the home portrait (9:16) Story/Reel/TikTok share image.
//
// Same CF Image Resizing self-fetch strategy as the landscape home.png.ts and
// the diploma story endpoints: self-fetch /og/home-story.svg with cf.image to
// get a PNG; fall back to SVG in local dev or when Image Resizing is unavailable.
export const prerender = false;

import type { APIRoute } from 'astro';
import { homeStorySvg } from '../../lib/og-image';

export const GET: APIRoute = async ({ request }) => {
  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = '/og/home-story.svg';

    const resp = await fetch(svgUrl, {
      // cf is a Cloudflare Workers extension to RequestInit.
      cf: { image: { format: 'png', width: 1080, height: 1920 } },
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

  return new Response(homeStorySvg(), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
