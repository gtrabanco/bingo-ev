export const prerender = false;

import type { APIRoute } from 'astro';
import { svgToPng } from '../../lib/svg-to-png';

// Inline the static favicon SVG — avoids a loopback fetch.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b3d2e"/>
  <circle cx="32" cy="32" r="22" fill="#f6f0df"/>
  <circle cx="32" cy="32" r="14.5" fill="#b02e22"/>
  <path d="M35 21 L25.5 35 h5.5 l-2.5 9 9.5-14 h-5.5 z" fill="#f6f0df"/>
</svg>`;

export const GET: APIRoute = async ({ request }) => {
  const png = await svgToPng(LOGO_SVG, 512, new URL(request.url).origin);
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
