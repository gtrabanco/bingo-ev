export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { diplomaSvg } from '../../../lib/og-image';

interface CardRow {
  created_at: string;
  completed_at: string | null;
  nick: string | null;
}

const ID_PATTERN = /^[0-9a-z]{8}$/;
const FALLBACK_NICK = 'Alguien con mucha paciencia';

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const row = await env.DB.prepare(
    'SELECT nick, completed_at FROM cards WHERE id = ?1 AND completed_at IS NOT NULL',
  )
    .bind(id)
    .first<CardRow>();

  if (!row) return new Response(null, { status: 404 });

  const svg = diplomaSvg({
    nick: row.nick || FALLBACK_NICK,
    date: longDate.format(new Date(row.completed_at!)),
    cardId: id,
  });

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
};
