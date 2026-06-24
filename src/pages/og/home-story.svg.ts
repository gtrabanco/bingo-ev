import type { APIRoute } from 'astro';
import { homeStorySvg } from '../../lib/og-image';

export const GET: APIRoute = async () => {
  return new Response(homeStorySvg(), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
};
