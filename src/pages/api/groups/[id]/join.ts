// POST /api/groups/:id/join — attach the caller's card to a group. Joining
// always needs an alias (it's how others see you in the standings) and the
// card's owner secret. Password-protected groups also need the password. Only
// cards still in play can join: an already-completed card would be an instant,
// unearned win.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashGroupPassword } from '../../../../lib/groups';

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
  try {
    const body: unknown = await request.json();
    const data = body as {
      cardId?: unknown;
      secret?: unknown;
      alias?: unknown;
      password?: unknown;
    };
    if (typeof data.cardId === 'string') cardId = data.cardId;
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.alias === 'string') alias = data.alias.replace(CONTROL_CHARS, '').trim().slice(0, 32);
    if (typeof data.password === 'string') password = data.password.slice(0, 64);
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!ID_PATTERN.test(cardId) || !secret) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  // Alias is mandatory to take part in a group.
  if (!alias) return Response.json({ error: 'alias_required' }, { status: 400 });

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

  const result = await env.DB.prepare(
    'UPDATE cards SET group_id = ?3, alias = ?4 WHERE id = ?1 AND secret = ?2 AND completed_at IS NULL',
  )
    .bind(cardId, secret, groupId, alias)
    .run();

  // No row changed: wrong secret, unknown card, or already completed.
  if (!result.meta.changes) return Response.json({ error: 'cannot_join' }, { status: 403 });
  return new Response(null, { status: 204 });
};
