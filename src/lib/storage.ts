// localStorage persistence. Marks live inside the card record, keyed by card
// id, plus a pointer to the current card. Every access is guarded: private
// browsing modes may throw, and the game must keep working in-memory.
import { isValidCard, type CardState } from './card';

const PREFIX = 'evbingo';
const CURRENT_CARD_KEY = `${PREFIX}.currentCardId`;
const NICK_KEY = `${PREFIX}.nick`;

const cardKey = (cardId: string) => `${PREFIX}.card.${cardId}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full: keep playing in memory for this session.
  }
}

export function saveCard(card: CardState): void {
  write(cardKey(card.id), JSON.stringify(card));
  write(CURRENT_CARD_KEY, card.id);
}

export function loadCard(cardId: string): CardState | null {
  const raw = read(cardKey(cardId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Migrate the previous wire format (boolean marks) to MarkKind digits:
    // a true from the old format means "suffered it" (kind 1).
    if (typeof parsed === 'object' && parsed !== null) {
      const candidate = parsed as { marks?: unknown };
      if (Array.isArray(candidate.marks)) {
        candidate.marks = candidate.marks.map((mark) =>
          mark === true ? 1 : mark === false ? 0 : mark,
        );
      }
    }
    if (!isValidCard(parsed)) return null;
    return {
      ...parsed,
      completedAt: parsed.completedAt ?? null,
      secret: parsed.secret ?? null,
      groupId: parsed.groupId ?? null,
    };
  } catch {
    return null;
  }
}

export function loadCurrentCard(): CardState | null {
  const cardId = read(CURRENT_CARD_KEY);
  return cardId ? loadCard(cardId) : null;
}

export function saveNick(nick: string): void {
  write(NICK_KEY, nick);
}

export function loadNick(): string {
  return read(NICK_KEY) ?? '';
}

// Marking mode for the toggle: 'sin' (everything as sinvergüenza), 'mix'
// (tap = suffered, double tap = caused) or 'ev' (everything as suffered).
export type MarkMode = 'sin' | 'mix' | 'ev';
const MARK_MODE_KEY = `${PREFIX}.markMode`;

export function saveMarkMode(mode: MarkMode): void {
  write(MARK_MODE_KEY, mode);
}

export function loadMarkMode(): MarkMode {
  const raw = read(MARK_MODE_KEY);
  return raw === 'sin' || raw === 'ev' ? raw : 'mix';
}

// Newsletter opt-in is a one-shot: once the player has subscribed (no
// confirmation email — the form is the confirmation) we record it locally so
// we never pester them with the checkbox again.
const NEWSLETTER_KEY = `${PREFIX}.newsletter`;

export function markNewsletterSubscribed(): void {
  write(NEWSLETTER_KEY, '1');
}

export function isNewsletterSubscribed(): boolean {
  return read(NEWSLETTER_KEY) === '1';
}

// The player's alias: a public display label (group standings, shared views),
// never an identifier — identity stays with the card id/secret and the
// optional recovery email. Set from the widget above the card, no group needed.
const ALIAS_KEY = `${PREFIX}.alias`;

export function saveAlias(alias: string): void {
  write(ALIAS_KEY, alias);
}

export function loadAlias(): string {
  return read(ALIAS_KEY) ?? '';
}

const VEHICLE_TYPE_KEY = `${PREFIX}.vehicleType`;

export function saveVehicleType(type: string): void {
  write(VEHICLE_TYPE_KEY, type);
}

export function loadVehicleType(): string | null {
  return read(VEHICLE_TYPE_KEY);
}