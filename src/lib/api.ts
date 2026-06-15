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
// the owner secret. The cell layout goes along so /c/<id> can render it, and
// the alias (when the player has one) so the card is born labelled.
export function registerCard(
  cells: (string | null)[],
  alias = '',
  turnstileToken = '',
): Promise<RegisteredCard | null> {
  return request<RegisteredCard>('/api/cards', jsonInit({ cells, alias, 'cf-turnstile-response': turnstileToken }));
}

// Updates the card's alias — a display label for standings and shared views,
// never an identifier. Fire-and-forget, like the marks sync.
export function syncAlias(cardId: string, secret: string, alias: string): void {
  void request(`/api/cards/${cardId}/alias`, jsonInit({ secret, alias }));
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
// Returns 'locked' (409) when the server rejects because the diploma is sealed;
// 'ok' on success; 'error' on any other failure (network, 4xx, etc.).
// Callers must handle 'locked' by reverting local state to the server's version.
export async function syncMarks(
  cardId: string,
  secret: string,
  marks: string,
): Promise<'ok' | 'locked' | 'error'> {
  try {
    const response = await fetch(`/api/cards/${cardId}/marks`, {
      signal: AbortSignal.timeout(4000),
      ...jsonInit({ secret, marks }),
    });
    if (response.status === 409) return 'locked';
    if (response.ok || response.status === 204) return 'ok';
    return 'error';
  } catch {
    return 'error';
  }
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
  alias: string | null;
  groupId: string | null;
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
export function requestRecovery(email: string, turnstileToken = ''): Promise<Response | null> {
  return fetch('/api/recover', jsonInit({ email, 'cf-turnstile-response': turnstileToken }))
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

// Creates a bingo group. The creator's card (id + secret) becomes the owner —
// the office that kicks, deletes and gets handed over on leave. On a name
// clash (or other rejection) returns the error code so the UI can react.
export async function createGroup(
  name: string,
  settings: GroupSettings,
  owner: { cardId: string; secret: string } | null = null,
  turnstileToken = '',
): Promise<GroupResult> {
  try {
    const response = await fetch(
      '/api/groups',
      jsonInit({
        name,
        joinPolicy: settings.joinPolicy,
        password: settings.password,
        publicBoard: settings.publicBoard,
        cardId: owner?.cardId,
        secret: owner?.secret,
        'cf-turnstile-response': turnstileToken,
      }),
    );
    if (response.status === 429) return { ok: false, error: 'ratelimited' };
    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: string }
      | null;
    if (response.ok && data?.id) return { ok: true, id: data.id };
    return { ok: false, error: data?.error ?? 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export type GroupActionResult = { ok: true } | { ok: false; error: string };

async function groupAction(path: string, body: unknown, method = 'POST'): Promise<GroupActionResult> {
  try {
    const response = await fetch(path, jsonInit(body, method));
    if (response.ok || response.status === 204) return { ok: true };
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

// Owner moderation: unlink a member's card from the room. The card survives
// untouched — it just stops playing here. Auth is the owner card's id+secret.
// The error code matters: 'not_member' means the row already walked out.
export function kickMember(
  groupId: string,
  cardId: string,
  secret: string,
  memberId: string,
): Promise<GroupActionResult> {
  return groupAction(`/api/groups/${groupId}/kick`, { cardId, secret, memberId });
}

// Walks the caller's own card out of the room. If the owner leaves, the
// office passes to the most veteran member; an emptied room dissolves.
// 'not_member' here means the card was already out (kicked meanwhile).
export function leaveGroup(
  groupId: string,
  cardId: string,
  secret: string,
): Promise<GroupActionResult> {
  return groupAction(`/api/groups/${groupId}/leave`, { cardId, secret });
}

// Owner-only: dissolves the room. Every member card is unlinked, none is
// deleted — marks and diplomas stay with their owners.
export function deleteGroup(
  groupId: string,
  cardId: string,
  secret: string,
): Promise<GroupActionResult> {
  return groupAction(`/api/groups/${groupId}`, { cardId, secret }, 'DELETE');
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
  turnstileToken = '',
): Promise<JoinResult> {
  try {
    const response = await fetch(
      `/api/groups/${groupId}/join`,
      jsonInit({ cardId, secret, alias, password, 'cf-turnstile-response': turnstileToken }),
    );
    if (response.ok || response.status === 204) return { ok: true };
    if (response.status === 429) return { ok: false, error: 'ratelimited' };
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
  ownerCardId: string | null;
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
