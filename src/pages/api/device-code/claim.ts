// POST /api/device-code/claim {code} — single-use code claim.
// Atomically marks the code as consumed and returns the card id + secret so the
// receiving device can adopt the card into its localStorage.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { normalizeDeviceCode, isValidDeviceCodeFormat } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/rate-limit';

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return new Response(null, { status: 429 });
  }

  let rawCode = '';
  try {
    const body = await request.json() as { code?: unknown };
    if (typeof body.code === 'string') rawCode = body.code;
  } catch {
    return new Response(null, { status: 400 });
  }

  const code = normalizeDeviceCode(rawCode);
  if (!isValidDeviceCodeFormat(code)) return new Response(null, { status: 400 });

  const now = new Date().toISOString();

  // Atomic single-use claim: only succeeds if code exists, is not consumed, and
  // has not expired. The UPDATE is the "read + mark" in one statement.
  const claimed = await env.DB
    .prepare(
      `UPDATE device_codes SET consumed_at = ?
       WHERE code = ? AND consumed_at IS NULL AND expires_at > ?
       RETURNING card_id`
    )
    .bind(now, code, now)
    .first<{ card_id: string }>();

  if (!claimed) {
    // Missing, already consumed, or expired — all map to 410 Gone (not 404, to
    // avoid leaking whether a code ever existed).
    return new Response(null, { status: 410 });
  }

  const card = await env.DB
    .prepare('SELECT id, secret FROM cards WHERE id = ?')
    .bind(claimed.card_id)
    .first<{ id: string; secret: string | null }>();

  if (!card || !card.secret) return new Response(null, { status: 410 });

  return Response.json({ id: card.id, secret: card.secret });
};
