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
  // Set when the submitted nick was blocked (reserved/nsfw/pattern) and nulled
  // server-side. The win is still recorded; prompt the player to choose a new nick.
  nickError?: string;
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
  vehicleType: string | null = null,
): Promise<RegisteredCard | null> {
  return request<RegisteredCard>('/api/cards', jsonInit({ cells, alias, 'cf-turnstile-response': turnstileToken, vehicle_type: vehicleType }));
}

// Updates the card's alias — a display label for standings and shared views,
// never an identifier. Fire-and-forget, like the marks sync.
export function syncAlias(cardId: string, secret: string, alias: string, vehicleType: string | null = null): void {
  void request(`/api/cards/${cardId}/alias`, jsonInit({ secret, alias, vehicle_type: vehicleType }));
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
  vehicleType: string | null;
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

// Toggles the owner's diploma visibility in the public gallery.
// Returns true on success, false on any failure (offline-first: the game keeps working).
export async function setGalleryHidden(
  cardId: string,
  secret: string,
  hidden: boolean,
): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/cards/${cardId}/gallery`,
      { ...jsonInit({ secret, hidden }), signal: AbortSignal.timeout(4000) },
    );
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export function verificationUrl(cardId: string): string {
  return `${location.origin}/v/${cardId}`;
}

export function cardShareUrl(cardId: string): string {
  return `${location.origin}/c/${cardId}`;
}

export type { GalleryEntry } from './gallery';

export interface GalleryResponse {
  items: GalleryEntry[];
  count: number;
  counts: {
    honorific: Record<string, number>;
    vehicle: Record<string, number>;
  };
  hasMore: boolean;
  page: number;
}

export interface GalleryParams {
  page?: number;
  honorific?: string;
  vehicle?: string;
}

const GALLERY_EMPTY: GalleryResponse = {
  items: [],
  count: 0,
  counts: { honorific: {}, vehicle: {} },
  hasMore: false,
  page: 1,
};

// Fetches a page of publicly-listed diplomas. Degrades to an empty result
// when the Worker is unreachable — the gallery disappears, the game doesn't.
export async function fetchGallery(params: GalleryParams = {}): Promise<GalleryResponse> {
  try {
    const qs = new URLSearchParams();
    if (params.page && params.page > 1) qs.set('page', String(params.page));
    if (params.honorific) qs.set('honorific', params.honorific);
    if (params.vehicle) qs.set('vehicle', params.vehicle);
    const path = `/api/gallery${qs.size ? `?${qs}` : ''}`;
    const response = await fetch(path, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return GALLERY_EMPTY;
    return (await response.json()) as GalleryResponse;
  } catch {
    return GALLERY_EMPTY;
  }
}

// ---------------------------------------------------------------------------
// Account / session (feature 05-accounts)
// ---------------------------------------------------------------------------

export interface AccountInfo {
  provider: string;
  displayName: string | null;
  email: string | null;
  cardCount: number;
  publicHandle: string | null;
  profilePublic: boolean;
}

// Full-page navigation to the OAuth start endpoint — OAuth requires top-level
// redirect, not a fetch. Degrades silently if the Worker is down.
export function startLogin(provider: 'google' | 'x'): void {
  window.location.href = `/api/auth/${provider}/start`;
}

// POST to logout endpoint; clears session cookie server-side; redirects to /.
export async function logout(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(4000) });
    if (res.redirected) window.location.href = res.url;
    return res.ok || res.status === 302 || res.redirected;
  } catch {
    return false;
  }
}

// Returns the logged-in account's minimal identity, or null when logged out /
// Worker down.
export function fetchAccount(): Promise<AccountInfo | null> {
  return request<AccountInfo>('/api/account');
}

export interface ConflictCardInfo {
  cardId: string;
  marks: string;
  groupId: string | null;
  groupName: string | null;
  isGroupOwner: boolean;
}

export interface LinkCardConflict {
  existing: ConflictCardInfo;
  incoming: ConflictCardInfo;
}

export type LinkCardResult =
  | { ok: true }
  | { ok: false; conflict: LinkCardConflict }
  | { ok: false; error: string };

// Links a localStorage card to the logged-in account via the owner secret.
// Returns { ok: false, conflict } when the account already has a different active card.
export async function linkCard(cardId: string, secret: string): Promise<LinkCardResult> {
  try {
    const res = await fetch('/api/account/link-card', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cardId, secret }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok || res.status === 204) return { ok: true };
    if (res.status === 409) {
      const data = (await res.json().catch(() => null)) as { conflict?: LinkCardConflict } | null;
      if (data?.conflict) return { ok: false, conflict: data.conflict };
    }
    return { ok: false, error: 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

// Deletes an active card belonging to the logged-in account (session-auth only, no secret).
// 404 is treated as success — the card is already gone (idempotent).
export async function deleteAccountCard(cardId: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`/api/account/card/${cardId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000),
    });
    const ok = res.ok || res.status === 204 || res.status === 404;
    return { ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Deletes the account and its sessions; cards survive unlinked.
export async function deleteAccount(): Promise<boolean> {
  try {
    const res = await fetch('/api/account', { method: 'DELETE', signal: AbortSignal.timeout(4000) });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export type ProfileResult =
  | { ok: true }
  | { ok: false; error: string };

// Sets or updates the logged-in account's public handle and visibility.
// Degrades to { ok: false, error: 'offline' } when the Worker is unreachable.
export async function setProfile(handle: string, isPublic: boolean): Promise<ProfileResult> {
  try {
    const res = await fetch('/api/account/profile', {
      ...jsonInit({ handle, public: isPublic }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok || res.status === 204) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? 'failed' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

// ---------------------------------------------------------------------------
// Device-code cross-device card transfer (feature 05-accounts P7)
// ---------------------------------------------------------------------------

export interface DeviceCodeResult {
  code: string;
  expiresIn: number;
}

// Generates a short single-use code (format "ABC-DEF") that another device can
// enter at /activar to receive this card's id + secret. Requires the owner secret.
export async function requestDeviceCode(
  cardId: string,
  secret: string,
): Promise<DeviceCodeResult | null> {
  return request<DeviceCodeResult>(
    `/api/cards/${cardId}/device-code`,
    jsonInit({ secret }),
  );
}
