// DELETE /api/cards/:id — discard a regenerated or expired card. Completed
// cards are immune: their record is what makes issued diplomas verifiable.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const DELETE: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret: string | null = null;
  try {
    const body: unknown = await request.json();
    const raw = (body as { secret?: unknown })?.secret;
    if (typeof raw === 'string') secret = raw;
  } catch {
    // Legacy clients send no body; rows without a secret still match below.
  }

  // Owner-only for rows issued with a secret; legacy rows (secret NULL)
  // remain deletable without one. Completed cards are always immune.
  await env.DB.prepare(
    'DELETE FROM cards WHERE id = ?1 AND completed_at IS NULL AND (secret IS NULL OR secret = ?2)',
  )
    .bind(id, secret)
    .run();
  return new Response(null, { status: 204 });
};
