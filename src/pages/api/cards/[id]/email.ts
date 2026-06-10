// POST /api/cards/:id/email — link an email to a card (owner-only) so it can
// be recovered later, with an optional opt-in to the newsletter. No account,
// no password: the recovery email itself is the proof of ownership.
//
// GDPR: the email is stored on the card only to enable recovery; the
// newsletter opt-in is a separate, explicit consent recorded in its own table
// with the origin domain, so the list can later be shared across sites.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ID_PATTERN = /^[0-9a-z]{8}$/;
// Pragmatic email shape check; real validation is "did the mail arrive".
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  let secret = '';
  let email = '';
  let newsletter = false;
  try {
    const body: unknown = await request.json();
    const data = body as { secret?: unknown; email?: unknown; newsletter?: unknown };
    if (typeof data.secret === 'string') secret = data.secret;
    if (typeof data.email === 'string') email = data.email.trim().slice(0, 255).toLowerCase();
    newsletter = data.newsletter === true;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!secret || !EMAIL_PATTERN.test(email)) return new Response(null, { status: 400 });

  const result = await env.DB.prepare(
    'UPDATE cards SET email = ?3, newsletter = ?4 WHERE id = ?1 AND secret = ?2',
  )
    .bind(id, secret, email, newsletter ? 1 : 0)
    .run();

  if (!result.meta.changes) return new Response(null, { status: 403 });

  // Newsletter opt-in: record the explicit consent with the origin domain.
  // INSERT OR IGNORE keeps it idempotent across re-links.
  if (newsletter) {
    const source = new URL(request.url).hostname;
    await env.DB.prepare(
      'INSERT OR IGNORE INTO newsletter (email, source, consented_at) VALUES (?1, ?2, ?3)',
    )
      .bind(email, source, new Date().toISOString())
      .run();
  }

  return new Response(null, { status: 204 });
};
