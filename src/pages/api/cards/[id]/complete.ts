// POST /api/cards/:id/complete — record a completion if (and only if) it
// arrives within one month of the card's creation, per the server clock.
// On an already-completed card it only refreshes the diploma nick.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { expiryFromCreatedAt } from '../../../../lib/card';

const ID_PATTERN = /^[0-9a-z]{8}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

interface CardRow {
  created_at: string;
  completed_at: string | null;
}

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const db = env.DB;
  const row = await db
    .prepare('SELECT created_at, completed_at FROM cards WHERE id = ?1')
    .bind(id)
    .first<CardRow>();
  if (!row) return new Response(null, { status: 404 });

  let nick: string | null = null;
  try {
    const body: unknown = await request.json();
    const raw = (body as { nick?: unknown })?.nick;
    if (typeof raw === 'string') {
      nick = raw.replace(CONTROL_CHARS, '').trim().slice(0, 32) || null;
    }
  } catch {
    // Nick is optional; a body-less or malformed request still completes.
  }

  if (row.completed_at) {
    await db.prepare('UPDATE cards SET nick = ?2 WHERE id = ?1').bind(id, nick).run();
    return Response.json({ completedAt: row.completed_at });
  }

  const now = new Date();
  if (now.getTime() > expiryFromCreatedAt(row.created_at).getTime()) {
    // Expired without glory: per the house rules, the record is deleted.
    await db.prepare('DELETE FROM cards WHERE id = ?1').bind(id).run();
    return new Response(null, { status: 410 });
  }

  const completedAt = now.toISOString();
  await db
    .prepare('UPDATE cards SET completed_at = ?2, nick = ?3 WHERE id = ?1')
    .bind(id, completedAt, nick)
    .run();
  return Response.json({ completedAt });
};
