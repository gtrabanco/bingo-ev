// POST /api/cards — issue a new card: server-generated id + creation time,
// so the one-month window runs on the server clock, not the player's.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newCardId } from '../../../lib/card';

export const POST: APIRoute = async () => {
  const db = env.DB;
  const id = newCardId();
  const createdAt = new Date().toISOString();

  // Opportunistic GC: expired, never-completed cards vanish so the table
  // stays tiny. One day of slack so the precise (clamped) JS expiry check
  // at completion time always wins over SQLite's month arithmetic.
  await db.batch([
    db.prepare(
      "DELETE FROM cards WHERE completed_at IS NULL AND datetime(created_at) < datetime('now', '-1 month', '-1 day')",
    ),
    db.prepare('INSERT INTO cards (id, created_at) VALUES (?1, ?2)').bind(id, createdAt),
  ]);

  return Response.json({ id, createdAt }, { status: 201 });
};
