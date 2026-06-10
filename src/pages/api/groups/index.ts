// POST /api/groups — create a bingo group. Anyone can create one; the id in
// the share link is the only membership requirement.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newCardId } from '../../../lib/card';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export const POST: APIRoute = async ({ request }) => {
  let name = '';
  try {
    const body: unknown = await request.json();
    const raw = (body as { name?: unknown })?.name;
    if (typeof raw === 'string') {
      name = raw.replace(CONTROL_CHARS, '').trim().slice(0, 40);
    }
  } catch {
    // Name optional; fall through to the default below.
  }
  if (!name) name = 'Bingo sin nombre';

  const id = newCardId();
  await env.DB.prepare('INSERT INTO groups (id, name, created_at) VALUES (?1, ?2, ?3)')
    .bind(id, name, new Date().toISOString())
    .run();

  return Response.json({ id, name }, { status: 201 });
};
