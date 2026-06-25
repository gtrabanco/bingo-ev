export const prerender = false;

import type { APIRoute } from 'astro';
import { homeStorySvg } from '../../lib/og-image';
import { svgToPng } from '../../lib/svg-to-png';

export const GET: APIRoute = async () => {
  const png = await svgToPng(homeStorySvg(), 1080, 1920);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, immutable',
    },
  });
};
