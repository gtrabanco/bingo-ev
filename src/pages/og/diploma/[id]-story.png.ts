// PNG wrapper for the portrait (9:16) Story OG image.
// Same strategy as [id].png.ts: generate SVG inline, self-fetch with
// cf.image to get PNG via Cloudflare Image Resizing; fall back to SVG
// in local dev (blocked by global_fetch_strictly_public) or when Image
// Resizing is unavailable on the plan.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { honorificFor, unpackMarks } from '../../../lib/card';
import { FALLBACK_NICK } from '../../../lib/certificate-design';
import { diplomaStorySvg } from '../../../lib/og-image';

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

  const svg = diplomaStorySvg({
    nick: row.nick || FALLBACK_NICK,
    date: longDate.format(new Date(row.completed_at)),
    cardId: id,
    honorific,
  });

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
