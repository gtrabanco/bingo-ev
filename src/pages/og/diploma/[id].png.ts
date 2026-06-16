// PNG wrapper for the OG diploma image.
//
// Social networks (Twitter/X, Facebook, LinkedIn, WhatsApp) reject SVG as
// og:image. This endpoint self-fetches the SVG sibling and asks Cloudflare
// Image Resizing to convert it to PNG in-flight (cf.image extension on fetch).
//
// Requires Cloudflare Image Resizing to be enabled on the zone (included on
// paid plans that enable Cloudflare Images / Image Resizing). When not
// available, CF ignores cf.image and the SVG is returned as-is — the
// content-type check below passes it through unchanged so the URL still
// resolves (some platforms, e.g. Slack, do render SVG og:image).
export const prerender = false;

import type { APIRoute } from 'astro';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const svgUrl = new URL(request.url);
  svgUrl.pathname = `/og/diploma/${id}.svg`;

  const resp = await fetch(svgUrl, {
    // cf is a Cloudflare Workers extension to RequestInit — not in the standard types.
    cf: { image: { format: 'png', width: 1200, height: 630 } },
  } as unknown as RequestInit);

  if (!resp.ok) return new Response(null, { status: resp.status });

  const ct = resp.headers.get('content-type') ?? '';
  return new Response(resp.body, {
    headers: {
      'content-type': ct.startsWith('image/png') ? 'image/png' : 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
