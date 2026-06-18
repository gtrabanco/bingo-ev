// POST /api/cards/:id/device-code {secret} — generates a short single-use device
// code so the player can transfer their card to another device without typing the
// raw 16-char secret. Proves ownership via the owner secret.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  generateDeviceCode,
  normalizeDeviceCode,
  DEVICE_CODE_TTL_SECONDS,
} from '../../../../lib/auth';
import { checkRateLimit } from '../../../../lib/rate-limit';

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

export const POST: APIRoute = async ({ params, request }) => {
  const cardId = params.id ?? '';
  if (!cardId) return new Response(null, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return new Response(null, { status: 429 });
  }

  let secret: string | null = null;
  try {
    const body = await request.json() as { secret?: unknown };
    if (typeof body.secret === 'string') {
      secret = body.secret.replace(CONTROL_CHARS, '').trim().slice(0, 32) || null;
    }
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!secret) return new Response(null, { status: 400 });

  // Verify ownership: card must exist and secret must match.
  const card = await env.DB
    .prepare('SELECT id FROM cards WHERE id = ? AND secret = ?')
    .bind(cardId, secret)
    .first<{ id: string }>();
  if (!card) return new Response(null, { status: 403 });

  const code = generateDeviceCode();
  const normalizedCode = normalizeDeviceCode(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEVICE_CODE_TTL_SECONDS * 1000);

  await env.DB.batch([
    env.DB
      .prepare('INSERT INTO device_codes (code, card_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(normalizedCode, cardId, now.toISOString(), expiresAt.toISOString()),
    // Opportunistic GC: remove expired (consumed or not) codes.
    env.DB.prepare('DELETE FROM device_codes WHERE expires_at < ?').bind(now.toISOString()),
  ]);

  return Response.json({ code, expiresIn: DEVICE_CODE_TTL_SECONDS }, { status: 201 });
};
