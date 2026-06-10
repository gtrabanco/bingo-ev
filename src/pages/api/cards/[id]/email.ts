// POST /api/cards/:id/email — link an email to a card (owner-only) so it can
// be recovered later, with an optional opt-in to the newsletter. No account,
// no password: the recovery email itself is the proof of ownership.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { subscribeToNewsletter } from '../../../../lib/brevo';

const ID_PATTERN = /^[0-9a-z]{8}$/;
// Pragmatic email shape check; real validation is "did the mail arrive".
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function brevoConfig() {
  return {
    apiKey: env.BREVO_API_KEY,
    listId: env.BREVO_LIST_ID,
    senderEmail: env.BREVO_SENDER_EMAIL,
    senderName: env.BREVO_SENDER_NAME,
  };
}

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
    if (typeof data.email === 'string') email = data.email.trim().slice(0, 255);
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

  // Newsletter opt-in is best-effort and must not delay the response or fail
  // the link if Brevo is down or unconfigured.
  if (newsletter) {
    await subscribeToNewsletter(brevoConfig(), email).catch(() => false);
  }

  return new Response(null, { status: 204 });
};
