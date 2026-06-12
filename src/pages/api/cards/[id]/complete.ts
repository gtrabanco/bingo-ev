// POST /api/cards/:id/complete — record a completion if (and only if) it
// arrives within one month of the card's creation, per the server clock.
// On an already-completed card it only refreshes the diploma nick.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { expiryFromCreatedAt } from '../../../../lib/card';
import { settleDeparture } from '../../../../lib/groups';

const ID_PATTERN = /^[0-9a-z]{8}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

interface CardRow {
  created_at: string;
  completed_at: string | null;
  secret: string | null;
  group_id: string | null;
}

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const db = env.DB;
  const row = await db
    .prepare('SELECT created_at, completed_at, secret, group_id FROM cards WHERE id = ?1')
    .bind(id)
    .first<CardRow>();
  if (!row) return new Response(null, { status: 404 });

  let nick: string | null = null;
  let secret: string | null = null;
  try {
    const body: unknown = await request.json();
    const data = body as { nick?: unknown; secret?: unknown };
    if (typeof data.nick === 'string') {
      nick = data.nick.replace(CONTROL_CHARS, '').trim().slice(0, 32) || null;
    }
    if (typeof data.secret === 'string') secret = data.secret;
  } catch {
    // Nick is optional; a body-less or malformed request still completes.
  }

  // Owner-only: rows issued with a secret require it. Legacy rows pass.
  if (row.secret !== null && row.secret !== secret) {
    return new Response(null, { status: 403 });
  }

  if (row.completed_at) {
    await db.prepare('UPDATE cards SET nick = ?2 WHERE id = ?1').bind(id, nick).run();
    return Response.json({ completedAt: row.completed_at });
  }

  const now = new Date();
  if (now.getTime() > expiryFromCreatedAt(row.created_at).getTime()) {
    // Expired without glory: per the house rules, the record is deleted.
    // A member's departure still settles (handover, dissolution) so the
    // room's office never dangles on a deleted row.
    const deleted = await db
      .prepare('DELETE FROM cards WHERE id = ?1 RETURNING group_id')
      .bind(id)
      .first<{ group_id: string | null }>();
    if (deleted?.group_id) await settleDeparture(deleted.group_id, id);
    return new Response(null, { status: 410 });
  }

  const completedAt = now.toISOString();
  await db
    .prepare('UPDATE cards SET completed_at = ?2, nick = ?3 WHERE id = ?1')
    .bind(id, completedAt, nick)
    .run();

  // Group rule: only the FIRST completion claims the win. The conditional
  // update is atomic, so a near-simultaneous second bingo can't steal it.
  // Membership is re-checked inside the claim (not trusted from the pre-read
  // above): an admin kick landing in between would otherwise crown a card
  // that already left the room — a ghost winner blocking it forever.
  let groupWinner: boolean | undefined;
  if (row.group_id) {
    const claim = await db
      .prepare(
        `UPDATE groups SET winner_card_id = ?2
         WHERE id = ?1 AND winner_card_id IS NULL
           AND EXISTS (SELECT 1 FROM cards WHERE id = ?2 AND group_id = ?1)`,
      )
      .bind(row.group_id, id)
      .run();
    groupWinner = claim.meta.changes > 0;
  }

  return Response.json({ completedAt, groupWinner });
};
