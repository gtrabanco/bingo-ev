// POST /api/cards/:id/email — link an email to a card (owner-only) so it can
// be recovered later, with an optional opt-in to the newsletter. No account,
// no password: the recovery email itself is the proof of ownership.
//
// Newsletter opt-in: delegates to @gtrabanco/newsletter (double opt-in).
// Best-effort — a subscribe failure never blocks the card save.
// If NEWSLETTER_API_KEY is absent (dev/staging) the call is skipped silently.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createNewsletterClient } from '@gtrabanco/newsletter';
import { checkRateLimit } from '../../../../lib/rate-limit';

const ID_PATTERN = /^[0-9a-z]{8}$/;
// Pragmatic email shape check; real validation is "did the mail arrive".
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_PATTERN.test(id)) return new Response(null, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  if (!(await checkRateLimit('RATE_LIMITER_WRITE', ip))) return new Response(null, { status: 429 });

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

  // Newsletter opt-in: delegate to @gtrabanco/newsletter (double opt-in email sent automatically).
  // Best-effort — never blocks the card save. Skipped silently in dev (no NEWSLETTER_API_KEY).
  if (newsletter && env.NEWSLETTER_API_KEY) {
    try {
      const client = createNewsletterClient({
        apiKey: env.NEWSLETTER_API_KEY,
        baseUrl: 'https://gtrabanco.com',
      });
      await client.subscribe(email, {
        language: 'es',
        referrer_domain: 'bingo.gruxon.com',
        confirmRedirectUrl: 'https://bingo.gruxon.com',
        unsubscribeRedirectUrl: 'https://bingo.gruxon.com',
      });
    } catch {
      // best-effort: ignore subscribe errors
    }
  }

  return new Response(null, { status: 204 });
};
