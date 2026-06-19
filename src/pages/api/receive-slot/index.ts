// POST /api/receive-slot — creates an empty pull-direction transfer slot.
// A card-less device calls this to open a receive slot, then polls [code].ts.
// The slot code is rendered as a QR on /activar so a card-holding device can scan
// it and deposit its card via [code]/deposit.ts.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateDeviceCode, normalizeDeviceCode, DEVICE_CODE_TTL_SECONDS } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/rate-limit';

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return new Response(null, { status: 429 });
  }

  const code = normalizeDeviceCode(generateDeviceCode());
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEVICE_CODE_TTL_SECONDS * 1000);

  await env.DB.batch([
    env.DB
      .prepare(
        'INSERT INTO receive_slots (code, result_card_id, created_at, expires_at) VALUES (?, NULL, ?, ?)'
      )
      .bind(code, now.toISOString(), expiresAt.toISOString()),
    // Opportunistic GC: remove expired slots.
    env.DB.prepare('DELETE FROM receive_slots WHERE expires_at < ?').bind(now.toISOString()),
  ]);

  return Response.json({ code, expiresIn: DEVICE_CODE_TTL_SECONDS }, { status: 201 });
};
