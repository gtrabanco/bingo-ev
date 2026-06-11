// POST /api/groups — create a bingo group. The name must be unique; the
// creator picks who can join (open link vs password) and whether the board
// (standings + aliases) is public. The share link carries the random id;
// joining still happens from the group page with a mandatory alias.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { newCardId } from '../../../lib/card';
import { hashGroupPassword, isJoinPolicy } from '../../../lib/groups';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

// Admin token for the creator, same shape as a card's owner secret. It rules
// the group (kicks), not any card — cards come and go, the office doesn't.
function newAdminSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

export const POST: APIRoute = async ({ request }) => {
  let name = '';
  let joinPolicy: 'open' | 'password' = 'open';
  let password = '';
  let publicBoard = true;
  try {
    const body: unknown = await request.json();
    const data = body as {
      name?: unknown;
      joinPolicy?: unknown;
      password?: unknown;
      publicBoard?: unknown;
    };
    if (typeof data.name === 'string') {
      name = data.name.replace(CONTROL_CHARS, '').trim().slice(0, 40);
    }
    if (isJoinPolicy(data.joinPolicy)) joinPolicy = data.joinPolicy;
    if (typeof data.password === 'string') password = data.password.slice(0, 64);
    publicBoard = data.publicBoard !== false;
  } catch {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  // The name is required now, so two groups can't share a human label.
  if (!name) return Response.json({ error: 'name_required' }, { status: 400 });
  if (joinPolicy === 'password' && !password) {
    return Response.json({ error: 'password_required' }, { status: 400 });
  }

  const id = newCardId();
  const passwordHash = joinPolicy === 'password' ? await hashGroupPassword(id, password) : null;
  const adminSecret = newAdminSecret();

  try {
    await env.DB.prepare(
      `INSERT INTO groups (id, name, created_at, join_policy, password_hash, public_board, admin_secret)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(
        id,
        name,
        new Date().toISOString(),
        joinPolicy,
        passwordHash,
        publicBoard ? 1 : 0,
        adminSecret,
      )
      .run();
  } catch (error) {
    // Unique index on the name: surface the clash so the user picks another.
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return Response.json({ error: 'name_taken' }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ id, name, adminSecret }, { status: 201 });
};
