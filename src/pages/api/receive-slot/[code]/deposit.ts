// POST /api/receive-slot/:code/deposit {cardId, secret}
// A card-holding device proves ownership and deposits its card into a pending slot.
// First deposit wins — a second attempt on the same slot returns 410.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { normalizeDeviceCode, isValidDeviceCodeFormat } from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/rate-limit';

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;
const CARD_ID_RE = /^[0-9a-z]{8}$/;

export const POST: APIRoute = async ({ params, request }) => {
  const rawCode = params.code ?? '';
  const code = normalizeDeviceCode(rawCode);
  if (!isValidDeviceCodeFormat(code)) return new Response(null, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_WRITE', ip))) {
    return new Response(null, { status: 429 });
  }

  let cardId = '';
  let secret = '';
  try {
    const body = await request.json() as { cardId?: unknown; secret?: unknown };
    if (typeof body.cardId === 'string') {
      cardId = body.cardId.replace(CONTROL_CHARS, '').trim().slice(0, 8);
    }
    if (typeof body.secret === 'string') {
      secret = body.secret.replace(CONTROL_CHARS, '').trim().slice(0, 32);
    }
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!CARD_ID_RE.test(cardId) || !secret) return new Response(null, { status: 400 });

  // Prove ownership: card must exist and secret must match.
  const card = await env.DB
    .prepare('SELECT id FROM cards WHERE id = ? AND secret = ?')
    .bind(cardId, secret)
    .first<{ id: string }>();
  if (!card) return new Response(null, { status: 403 });

  const now = new Date().toISOString();

  // Atomic write-once: only succeeds if slot is pending, unconsumed, and unexpired.
  // First deposit wins — a second attempt on the same slot returns no rows.
  const deposited = await env.DB
    .prepare(
      `UPDATE receive_slots SET result_card_id = ?
       WHERE code = ? AND result_card_id IS NULL AND consumed_at IS NULL AND expires_at > ?
       RETURNING code`
    )
    .bind(cardId, code, now)
    .first<{ code: string }>();

  if (!deposited) {
    // Missing, already filled, consumed, or expired → all map to 410.
    return new Response(null, { status: 410 });
  }

  return new Response(null, { status: 204 });
};
