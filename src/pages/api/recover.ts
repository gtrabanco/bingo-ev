// POST /api/recover — email a player the owner links of every card tied to
// their address. The response is deliberately identical whether or not any
// card matched, so the endpoint can't be used to probe which emails are in
// the system. The links (with secrets) only ever travel to the inbox.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { expiryFromCreatedAt } from '../../lib/card';
import { sendRecoveryEmail } from '../../lib/brevo';
import { verifyTurnstile } from '../../lib/turnstile';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CardRow {
  id: string;
  secret: string | null;
  created_at: string;
  completed_at: string | null;
}

export const POST: APIRoute = async ({ request }) => {
  let email = '';
  let tsToken = '';
  try {
    const body: unknown = await request.json();
    const data = body as { email?: unknown; 'cf-turnstile-response'?: unknown };
    const raw = data?.email;
    if (typeof raw === 'string') email = raw.trim().slice(0, 255);
    if (typeof data?.['cf-turnstile-response'] === 'string') tsToken = data['cf-turnstile-response'];
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) return new Response(null, { status: 400 });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await verifyTurnstile(tsToken, ip))) return new Response(null, { status: 403 });

  const origin = new URL(request.url).origin;
  const rows = await env.DB.prepare(
    'SELECT id, secret, created_at, completed_at FROM cards WHERE email = ?1',
  )
    .bind(email)
    .all<CardRow>();

  // Only surface cards that are still valid: completed, or pending within the
  // one-month window. The owner link carries the secret so play can resume.
  const now = Date.now();
  const links = (rows.results ?? [])
    .filter(
      (row) =>
        row.completed_at !== null || now <= expiryFromCreatedAt(row.created_at).getTime(),
    )
    .map((row) => ({
      id: row.id,
      url: row.secret
        ? `${origin}/?card=${row.id}&k=${row.secret}`
        : `${origin}/c/${row.id}`,
      completed: row.completed_at !== null,
    }));

  if (links.length > 0) {
    await sendRecoveryEmail(
      {
        apiKey: env.BREVO_API_KEY,
        senderEmail: env.BREVO_SENDER_EMAIL,
        senderName: env.BREVO_SENDER_NAME,
      },
      email,
      links,
    ).catch(() => false);
  }

  // Always 204, regardless of whether anything matched or the mail sent.
  return new Response(null, { status: 204 });
};
