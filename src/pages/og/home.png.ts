export const prerender = false;

import type { APIRoute } from 'astro';
import { homeSvg } from '../../lib/og-image';
import { svgToPng } from '../../lib/svg-to-png';

export const GET: APIRoute = async ({ request }) => {
  const png = await svgToPng(homeSvg(), 1200, new URL(request.url).origin);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, immutable',
    },
  });
};
