// GET /api/receive-slot/:code — generator polls for a deposit result.
// 204 = still pending (keep polling)
// 200 = deposited; atomically consumed; returns { id, secret } of the deposited card
// 410 = expired, missing, or already consumed (stop polling)
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { normalizeDeviceCode, isValidDeviceCodeFormat } from '../../../lib/auth';

export const GET: APIRoute = async ({ params }) => {
  const rawCode = params.code ?? '';
  const code = normalizeDeviceCode(rawCode);
  if (!isValidDeviceCodeFormat(code)) return new Response(null, { status: 400 });

  const now = new Date().toISOString();

  // Atomic consume-once: only matches when a result has been deposited AND not yet consumed.
  const consumed = await env.DB
    .prepare(
      `UPDATE receive_slots SET consumed_at = ?
       WHERE code = ? AND result_card_id IS NOT NULL AND consumed_at IS NULL AND expires_at > ?
       RETURNING result_card_id`
    )
    .bind(now, code, now)
    .first<{ result_card_id: string }>();

  if (consumed) {
    const card = await env.DB
      .prepare('SELECT id, secret FROM cards WHERE id = ?')
      .bind(consumed.result_card_id)
      .first<{ id: string; secret: string | null }>();

    if (!card?.secret) return new Response(null, { status: 410 });
    return Response.json({ id: card.id, secret: card.secret });
  }

  // Disambiguate pending from expired/missing: check whether the slot still exists
  // and hasn't expired. If it does and result_card_id is null → still pending (204).
  const slot = await env.DB
    .prepare('SELECT expires_at, consumed_at FROM receive_slots WHERE code = ?')
    .bind(code)
    .first<{ expires_at: string; consumed_at: string | null }>();

  if (!slot || slot.expires_at <= now || slot.consumed_at !== null) {
    return new Response(null, { status: 410 });
  }

  // Slot exists, not expired, not consumed, no result yet — still pending.
  return new Response(null, { status: 204 });
};
