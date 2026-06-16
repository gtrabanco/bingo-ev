import rawBlocklist from '../data/blocklist.json';

export type BlockReason = 'reserved' | 'nsfw' | 'pattern';
export type CheckNickResult = { blocked: false } | { blocked: true; reason: BlockReason };

// Normalize for wordlist comparison: trim, lowercase, remove diacritics.
function normalize(nick: string): string {
  return nick
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

// Pattern checks run on the raw nick (@ and . are literal characters).
// Domain regex: requires a TLD-like segment — dot + 2+ letters + slash or end of
// string — to avoid rejecting innocent dots ("Sr. Sufridor", "J.A.").
const SOCIAL_RE = /@/;
const DOMAIN_RE = /\.[a-z]{2,}(\/|$)/i;

export function checkNick(nick: string): CheckNickResult {
  // 1. Pattern checks (raw nick, no normalization).
  if (SOCIAL_RE.test(nick)) return { blocked: true, reason: 'pattern' };
  if (DOMAIN_RE.test(nick)) return { blocked: true, reason: 'pattern' };

  // 2. Wordlist checks (normalized nick).
  const normalized = normalize(nick);
  if (rawBlocklist.reserved.some((term) => normalized.includes(term))) {
    return { blocked: true, reason: 'reserved' };
  }
  if (rawBlocklist.nsfw.some((term) => normalize(term) === term
    ? normalized.includes(term)
    : normalized.includes(normalize(term)))) {
    return { blocked: true, reason: 'nsfw' };
  }

  return { blocked: false };
}

// Error messages keyed by reason — used at write time (nick rejection) and
// surfaced to the client as the `error` field in a 422 response.
export const BLOCK_MESSAGES: Record<BlockReason, string> = {
  reserved: 'Nombre reservado',
  nsfw: 'Nombre inapropiado',
  pattern: 'Nombre no permitido',
};
