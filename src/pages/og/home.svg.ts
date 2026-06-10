import type { APIRoute } from 'astro';
import { homeSvg } from '../../lib/og-image';

export const GET: APIRoute = async () => {
  const svg = homeSvg();

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
