// POST /api/groups — create a bingo group. The name must be unique; the
// creator picks who can join (open link vs password) and whether the board
// (standings + aliases) is public. The share link carries the random id;
// joining still happens from the group page with a mandatory alias.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newCardId } from '../../../lib/card';
import { hashGroupPassword, isJoinPolicy, orphanedOwnerRepair } from '../../../lib/groups';
import { verifyTurnstile } from '../../../lib/turnstile';
import { checkRateLimit } from '../../../lib/rate-limit';

const ID_PATTERN = /^[0-9a-z]{8}$/;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export const POST: APIRoute = async ({ request }) => {
  let name = '';
  let joinPolicy: 'open' | 'password' = 'open';
  let password = '';
  let publicBoard = true;
  let cardId = '';
  let secret = '';
  let tsToken = '';
  try {
    const body: unknown = await request.json();
    const data = body as {
      name?: unknown;
      joinPolicy?: unknown;
      password?: unknown;
      publicBoard?: unknown;
      cardId?: unknown;
      secret?: unknown;
      'cf-turnstile-response'?: unknown;
    };
    if (typeof data.name === 'string') {
      name = data.name.replace(CONTROL_CHARS, '').trim().slice(0, 40);
    }
    if (isJoinPolicy(data.joinPolicy)) joinPolicy = data.joinPolicy;
    if (typeof data.password === 'string') password = data.password.slice(0, 64);
    publicBoard = data.publicBoard !== false;
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data['cf-turnstile-response'] === 'string') tsToken = data['cf-turnstile-response'];
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  // The name is required now, so two groups can't share a human label.
  if (!name) return Response.json({ error: 'name_required' }, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return Response.json({ error: 'ratelimited' }, { status: 429 });
  }
  if (!(await verifyTurnstile(tsToken, ip))) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  if (joinPolicy === 'password' && !password) {
    return Response.json({ error: 'password_required' }, { status: 400 });
  }

  // Ownership belongs to the creator's CARD (id + secret verified) so the
  // office can later be handed over or claimed by moderation endpoints. A
  // creator without a registered card just makes an ownerless room. A
  // COMPLETED card is refused outright: it can never join (join.ts), so it
  // would own a room it can't play in — and on private boards it couldn't
  // even see its own moderation buttons. Regenerating is the way forward.
  let ownerCardId: string | null = null;
  if (ID_PATTERN.test(cardId) && secret) {
    const owner = await env.DB.prepare(
      'SELECT completed_at FROM cards WHERE id = ?1 AND secret = ?2',
    )
      .bind(cardId, secret)
      .first<{ completed_at: string | null }>();
    if (owner?.completed_at) {
      return Response.json({ error: 'card_completed' }, { status: 409 });
    }
    if (owner) ownerCardId = cardId;
  }

  const id = newCardId();
  const passwordHash = joinPolicy === 'password' ? await hashGroupPassword(id, password) : null;

  try {
    await env.DB.batch([
      // Opportunistic GC, like the cards table: rooms nobody plays in any
      // more (members expired or walked out pre-dissolution logic) vanish
      // after the same one-month horizon cards live by.
      env.DB.prepare(
        `DELETE FROM groups
         WHERE datetime(created_at) < datetime('now', '-1 month', '-1 day')
           AND NOT EXISTS (SELECT 1 FROM cards WHERE group_id = groups.id)`,
      ),
      // Rooms whose owner card vanished without settling get a new owner.
      orphanedOwnerRepair(),
      env.DB.prepare(
        `INSERT INTO groups (id, name, created_at, join_policy, password_hash, public_board, owner_card_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        id,
        name,
        new Date().toISOString(),
        joinPolicy,
        passwordHash,
        publicBoard ? 1 : 0,
        ownerCardId,
      ),
    ]);
  } catch (error) {
    // Unique index on the name: surface the clash so the user picks another.
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return Response.json({ error: 'name_taken' }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ id, name }, { status: 201 });
};
