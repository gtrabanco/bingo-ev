// POST /api/groups/:id/join — attach the caller's card to a group. Joining
// always needs an alias (it's how others see you in the standings) and the
// card's owner secret. Password-protected groups also need the password. Only
// cards still in play can join: an already-completed card would be an instant,
// unearned win.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashGroupPassword } from '../../../../lib/groups';
import { verifyTurnstile } from '../../../../lib/turnstile';
import { checkRateLimit } from '../../../../lib/rate-limit';

const ID_PATTERN = /^[0-9a-z]{8}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

interface GroupRow {
  id: string;
  join_policy: string;
  password_hash: string | null;
}

export const POST: APIRoute = async ({ params, request }) => {
  const groupId = params.id ?? '';
  if (!ID_PATTERN.test(groupId)) return Response.json({ error: 'bad_request' }, { status: 400 });

  let cardId = '';
  let secret = '';
  let alias = '';
  let password = '';
  let tsToken = '';
  try {
    const body: unknown = await request.json();
    const data = body as {
      cardId?: unknown;
      secret?: unknown;
      alias?: unknown;
      password?: unknown;
      'cf-turnstile-response'?: unknown;
    };
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.alias === 'string') alias = data.alias.replace(CONTROL_CHARS, '').trim().slice(0, 32);
    if (typeof data.password === 'string') password = data.password.slice(0, 64);
    if (typeof data['cf-turnstile-response'] === 'string') tsToken = data['cf-turnstile-response'];
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!ID_PATTERN.test(cardId) || !secret) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  // Alias is mandatory to take part in a group.
  if (!alias) return Response.json({ error: 'alias_required' }, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await checkRateLimit('RATE_LIMITER_CREATE', ip))) {
    return Response.json({ error: 'ratelimited' }, { status: 429 });
  }
  if (!(await verifyTurnstile(tsToken, ip))) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const group = await env.DB.prepare(
    'SELECT id, join_policy, password_hash FROM groups WHERE id = ?1',
  )
    .bind(groupId)
    .first<GroupRow>();
  if (!group) return Response.json({ error: 'not_found' }, { status: 404 });

  // Password gate (when the group asks for one).
  if (group.join_policy === 'password') {
    const expected = group.password_hash;
    const given = password ? await hashGroupPassword(groupId, password) : '';
    if (!expected || given !== expected) {
      return Response.json({ error: 'bad_password' }, { status: 403 });
    }
  }

  // One card, one group: a card already playing elsewhere can't switch rooms
  // (regenerating the card is the way out). Re-joining the same group is fine
  // — it just refreshes the alias. Two existence guards run INSIDE the
  // update: the target room must still exist (groups are deletable now, and
  // this UPDATE races owner-delete/dissolution/GC), and a membership left
  // dangling by one of those deletions counts as free, not as "elsewhere".
  const result = await env.DB.prepare(
    `UPDATE cards SET group_id = ?3, alias = ?4
     WHERE id = ?1 AND secret = ?2 AND completed_at IS NULL
       AND (group_id IS NULL OR group_id = ?3
            OR NOT EXISTS (SELECT 1 FROM groups WHERE id = cards.group_id))
       AND EXISTS (SELECT 1 FROM groups WHERE id = ?3)`,
  )
    .bind(cardId, secret, groupId, alias)
    .run();

  if (!result.meta.changes) {
    // Diagnose so the UI can explain: in another (live) group vs. plain
    // rejection (wrong secret, unknown card, completed, or the target room
    // vanished mid-join).
    const row = await env.DB.prepare(
      `SELECT group_id,
              EXISTS (SELECT 1 FROM groups WHERE id = cards.group_id) AS group_alive
       FROM cards WHERE id = ?1 AND secret = ?2 AND completed_at IS NULL`,
    )
      .bind(cardId, secret)
      .first<{ group_id: string | null; group_alive: number }>();
    if (row?.group_id && row.group_alive && row.group_id !== groupId) {
      return Response.json({ error: 'already_grouped' }, { status: 409 });
    }
    return Response.json({ error: 'cannot_join' }, { status: 403 });
  }
  return new Response(null, { status: 204 });
};
