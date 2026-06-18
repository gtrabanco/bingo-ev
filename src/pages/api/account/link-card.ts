// POST /api/account/link-card — link a card to the logged-in account.
// Returns 409 with a conflict payload when the account already has a different active card.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSession } from '../../../lib/auth';

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

type ConflictCard = {
  id: string;
  marks: string;
  completed_at: string | null;
  group_id: string | null;
  group_name: string | null;
  is_owner: number;
};

function toConflictEntry(row: ConflictCard) {
  return {
    cardId: row.id,
    marks: row.marks,
    groupId: row.group_id,
    groupName: row.group_name,
    isGroupOwner: row.is_owner === 1,
  };
}

const CONFLICT_SELECT = `
  SELECT c.id, c.marks, c.completed_at, c.group_id, g.name AS group_name,
         CASE WHEN g.owner_card_id = c.id THEN 1 ELSE 0 END AS is_owner
  FROM cards c LEFT JOIN groups g ON g.id = c.group_id
`;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request, env.DB);
  if (!session) return new Response(null, { status: 401 });

  let cardId: string | null = null;
  let secret: string | null = null;
  try {
    const body = await request.json() as { cardId?: unknown; secret?: unknown };
    if (typeof body.cardId === 'string') cardId = body.cardId.replace(CONTROL_CHARS, '').trim().slice(0, 8) || null;
    if (typeof body.secret === 'string') secret = body.secret.replace(CONTROL_CHARS, '').trim().slice(0, 32) || null;
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!cardId || !secret) return new Response(null, { status: 400 });

  // Verify secret and fetch incoming card's conflict-relevant data.
  const incoming = await env.DB
    .prepare(`${CONFLICT_SELECT} WHERE c.id = ? AND (c.secret = ? OR c.secret IS NULL)`)
    .bind(cardId, secret)
    .first<ConflictCard>();

  // Secret mismatch or card not found — return 204 to avoid leaking card existence.
  if (!incoming) return new Response(null, { status: 204 });

  // Only active (non-completed) cards can conflict; multiple diplomas are allowed.
  if (incoming.completed_at === null) {
    const existing = await env.DB
      .prepare(
        `${CONFLICT_SELECT}
         WHERE c.account_id = ? AND c.completed_at IS NULL AND c.id != ?
         LIMIT 1`
      )
      .bind(session.accountId, cardId)
      .first<ConflictCard>();

    if (existing) {
      return Response.json(
        {
          conflict: {
            existing: toConflictEntry(existing),
            incoming: toConflictEntry(incoming),
          },
        },
        { status: 409 },
      );
    }
  }

  // No conflict — atomically stamp the account on the card (secret re-verified in SQL).
  await env.DB
    .prepare('UPDATE cards SET account_id = ? WHERE id = ? AND (secret = ? OR secret IS NULL)')
    .bind(session.accountId, cardId, secret)
    .run();

  return new Response(null, { status: 204 });
};
