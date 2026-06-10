// DELETE /api/cards/:id — discard a regenerated or expired card. Completed
// cards are immune: their record is what makes issued diplomas verifiable.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  await env.DB.prepare('DELETE FROM cards WHERE id = ?1 AND completed_at IS NULL')
    .bind(id)
    .run();
  return new Response(null, { status: 204 });
};
