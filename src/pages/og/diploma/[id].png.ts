// PNG wrapper for the OG diploma image.
//
// Social networks (Twitter/X, Facebook, LinkedIn, WhatsApp) reject SVG as
// og:image. This endpoint generates the SVG inline, then asks Cloudflare
// Image Resizing to convert it to PNG via a self-fetch (cf.image extension).
//
// Requires Cloudflare Image Resizing to be enabled on the zone. In local dev
// the self-fetch is blocked by the global_fetch_strictly_public flag, so the
// endpoint falls back to serving the SVG — the same graceful path used when
// Image Resizing is not available on the plan.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { honorificFor, unpackMarks } from '../../../lib/card';
import { FALLBACK_NICK } from '../../../lib/certificate-design';
import { diplomaSvg } from '../../../lib/og-image';

interface CardRow {
  completed_at: string;
  nick: string | null;
  marks: string | null;
  cells: string | null;
}

const ID_PATTERN = /^[0-9a-z]{8}$/;

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const row = await env.DB.prepare(
    'SELECT nick, completed_at, marks, cells FROM cards WHERE id = ?1 AND completed_at IS NOT NULL',
  )
    .bind(id)
    .first<CardRow>();

  if (!row) return new Response(null, { status: 404 });

  const marks = row.marks ? unpackMarks(row.marks) : [];
  const cells: (string | null)[] = row.cells ? JSON.parse(row.cells) : [];
  const honorific = honorificFor(cells, marks);

  const svg = diplomaSvg({
    nick: row.nick || FALLBACK_NICK,
    date: longDate.format(new Date(row.completed_at)),
    cardId: id,
    honorific,
  });

  // Try Cloudflare Image Resizing: self-fetch the SVG sibling with cf.image
  // so CF converts it to PNG on the way back. Fails in local dev
  // (global_fetch_strictly_public blocks localhost) and on plans without
  // Image Resizing — both are caught and fall through to the SVG fallback.
  try {
    const svgUrl = new URL(request.url);
    svgUrl.pathname = `/og/diploma/${id}.svg`;

    const resp = await fetch(svgUrl, {
      // cf is a Cloudflare Workers extension to RequestInit.
      cf: { image: { format: 'png', width: 1200, height: 630 } },
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
