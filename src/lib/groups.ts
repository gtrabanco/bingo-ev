// Shared bits for bingo groups. The hashing runs server-side (Workers'
// Web Crypto) — passwords travel same-origin in the clear and are only ever
// stored hashed, salted with the group id so the same password in two groups
// produces different hashes.

export type JoinPolicy = 'open' | 'password';

export function isJoinPolicy(value: unknown): value is JoinPolicy {
  return value === 'open' || value === 'password';
}

// Salted SHA-256, hex-encoded. Low-stakes (it only gates joining a parody
// bingo) but there's no reason to keep plaintext around.
export async function hashGroupPassword(groupId: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${groupId}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
