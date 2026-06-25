export const prerender = false;

import type { APIRoute } from 'astro';
import { loadDiplomaData, ID_PATTERN } from '../../../lib/og-diploma';
import { diplomaStorySvg } from '../../../lib/og-image';
import { svgToPng } from '../../../lib/svg-to-png';

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const data = await loadDiplomaData(id);
  if (!data) return new Response(null, { status: 404 });

  const png = await svgToPng(diplomaStorySvg(data), 1080, 1920);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, immutable',
    },
  });
};
