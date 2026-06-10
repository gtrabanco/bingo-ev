// Thin client for the registry API. Every call degrades to null on failure:
// the game must keep working offline or with the Worker down — the card just
// won't be verifiable or watchable afterwards.
import type { MarkKind } from './card';

export interface RegisteredCard {
  id: string;
  createdAt: string;
  secret: string;
}

export interface CompletionReceipt {
  completedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    // Bounded wait: a slow Worker must never block the game.
    const response = await fetch(path, { signal: AbortSignal.timeout(4000), ...init });
    if (!response.ok) return null;
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function jsonInit(body: unknown, method = 'POST'): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Asks the server to issue a card: id, creation timestamp (server clock) and
// the owner secret. The cell layout goes along so /c/<id> can render it.
export function registerCard(cells: (string | null)[]): Promise<RegisteredCard | null> {
  return request<RegisteredCard>('/api/cards', jsonInit({ cells }));
}

// Reports a completion (or updates the nick of an already-completed card).
export function reportCompletion(
  cardId: string,
  nick: string,
  secret: string | null,
): Promise<CompletionReceipt | null> {
  return request<CompletionReceipt>(
    `/api/cards/${cardId}/complete`,
    jsonInit({ nick, secret }),
  );
}

// Pushes the current marks so the shared /c/<id> view stays up to date.
export function syncMarks(cardId: string, secret: string, marks: string): void {
  void request(`/api/cards/${cardId}/marks`, jsonInit({ secret, marks }));
}

// Removes a never-completed card (regenerated or expired). Fire-and-forget.
export function discardCard(cardId: string, secret: string | null): void {
  void request(`/api/cards/${cardId}`, jsonInit({ secret }, 'DELETE'));
}

// Owner rehydration: fetch a card's full state with its secret (recovery
// links). Returns null if it doesn't exist or the secret is wrong.
export function fetchOwnedCard(
  cardId: string,
  secret: string,
): Promise<{
  id: string;
  createdAt: string;
  completedAt: string | null;
  cells: (string | null)[];
  marks: MarkKind[];
  secret: string;
} | null> {
  return request(`/api/cards/${cardId}?k=${encodeURIComponent(secret)}`);
}

// Links an email to a card (owner-only) for later recovery; optional opt-in.
export function linkEmail(
  cardId: string,
  secret: string,
  email: string,
  newsletter: boolean,
): Promise<Response | null> {
  return fetch(`/api/cards/${cardId}/email`, jsonInit({ secret, email, newsletter }))
    .then((r) => (r.ok || r.status === 204 ? r : null))
    .catch(() => null);
}

// Asks the server to email recovery links for every card tied to an address.
export function requestRecovery(email: string): Promise<Response | null> {
  return fetch('/api/recover', jsonInit({ email }))
    .then((r) => (r.ok || r.status === 204 ? r : null))
    .catch(() => null);
}

export interface GroupSettings {
  joinPolicy: 'open' | 'password';
  password: string;
  publicBoard: boolean;
}

export type GroupResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Creates a bingo group. On success returns its id for the /g/<id> page; on a
// name clash (or other rejection) returns the error code so the UI can react.
export async function createGroup(name: string, settings: GroupSettings): Promise<GroupResult> {
  try {
    const response = await fetch(
      '/api/groups',
      jsonInit({
        name,
        joinPolicy: settings.joinPolicy,
        password: settings.password,
        publicBoard: settings.publicBoard,
      }),
    );
    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: string }
      | null;
    if (response.ok && data?.id) return { ok: true, id: data.id };
    return { ok: false, error: data?.error ?? 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export type JoinResult = { ok: true } | { ok: false; error: string };

// Joins the caller's card to a group with a mandatory alias (and the password
// when the group asks for one). Returns the error code on failure.
export async function joinGroup(
  groupId: string,
  cardId: string,
  secret: string,
  alias: string,
  password = '',
): Promise<JoinResult> {
  try {
    const response = await fetch(
      `/api/groups/${groupId}/join`,
      jsonInit({ cardId, secret, alias, password }),
    );
    if (response.ok || response.status === 204) return { ok: true };
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export interface GroupStanding {
  id: string;
  alias: string | null;
  marks: string | null;
  completedAt: string | null;
}

export interface GroupStandings {
  name: string;
  winnerCardId: string | null;
  members: GroupStanding[];
}

// Members-only standings for a private group: proves membership with the
// card's owner secret. Returns null if not a member or unreachable.
export function fetchGroupStandings(
  groupId: string,
  cardId: string,
  secret: string,
): Promise<GroupStandings | null> {
  return request<GroupStandings>(
    `/api/groups/${groupId}/standings`,
    jsonInit({ cardId, secret }),
  );
}

export function verificationUrl(cardId: string): string {
  return `${location.origin}/v/${cardId}`;
}

export function cardShareUrl(cardId: string): string {
  return `${location.origin}/c/${cardId}`;
}
