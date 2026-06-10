// Thin client for the registry API. Every call degrades to null on failure:
// the game must keep working offline or with the Worker down — the card just
// won't be verifiable or watchable afterwards.

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

export function verificationUrl(cardId: string): string {
  return `${location.origin}/v/${cardId}`;
}

export function cardShareUrl(cardId: string): string {
  return `${location.origin}/c/${cardId}`;
}
