// PNG wrapper for the portrait (9:16) Story OG image.
// Same strategy as [id].png.ts: generate SVG inline, self-fetch with
// cf.image to get PNG via Cloudflare Image Resizing; fall back to SVG
// in local dev (blocked by global_fetch_strictly_public) or when Image
// Resizing is unavailable on the plan.
export const prerender = false;

import type { APIRoute } from 'astro';
import { loadDiplomaData, ID_PATTERN } from '../../../lib/og-diploma';
import { diplomaStorySvg } from '../../../lib/og-image';

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const data = await loadDiplomaData(id);
  if (!data) return new Response(null, { status: 404 });

  const svg = diplomaStorySvg(data);

  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = `/og/diploma/${id}-story.svg`;

    const resp = await fetch(svgUrl, {
      cf: { image: { format: 'png', width: 1080, height: 1920 } },
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
