// Per-IP rate limiting via the Cloudflare Workers Rate Limiting binding.
// Degrades open when the binding is absent — local dev works without configuring it.
import { env } from 'cloudflare:workers';

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

// Returns true (allow) or false (deny). Degrade open on missing binding or error.
export async function checkRateLimit(bindingName: string, key: string): Promise<boolean> {
  const limiter = (env as Record<string, unknown>)[bindingName] as RateLimiter | undefined;
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true; // platform error → fail open (don't block legitimate users)
  }
}
