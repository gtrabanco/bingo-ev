export const prerender = false;

import type { APIRoute } from 'astro';
import { loadDiplomaData, ID_PATTERN } from '../../../lib/og-diploma';
import { diplomaSvg } from '../../../lib/og-image';

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const data = await loadDiplomaData(id);
  if (!data) return new Response(null, { status: 404 });

  return new Response(diplomaSvg(data), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
