// Cloudflare Turnstile token verification (server-side).
// Fail closed: rejects when the secret is configured but the token is missing
// or invalid. Degrades open when TURNSTILE_SECRET_KEY is not set so local dev
// works without configuring Turnstile.
import { env } from 'cloudflare:workers';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secretKey = env.TURNSTILE_SECRET_KEY as string | undefined;
  if (!secretKey) return true; // secret not configured → skip (local dev / misconfigured)
  if (!token) return false;    // secret present but no token → reject

  const body = new FormData();
  body.append('secret', secretKey);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false; // network failure verifying → fail closed
  }
}
