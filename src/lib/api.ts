// Thin client for the verification API. Every call degrades to null on
// failure: the game must keep working offline or with the Worker down —
// the card just won't be verifiable afterwards.

export interface RegisteredCard {
  id: string;
  createdAt: string;
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

// Asks the server to issue a card id + creation timestamp (server clock).
export function registerCard(): Promise<RegisteredCard | null> {
  return request<RegisteredCard>('/api/cards', { method: 'POST' });
}

// Reports a completion (or updates the nick of an already-completed card).
export function reportCompletion(
  cardId: string,
  nick: string,
): Promise<CompletionReceipt | null> {
  return request<CompletionReceipt>(`/api/cards/${cardId}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nick }),
  });
}

// Removes a never-completed card (regenerated or expired). Fire-and-forget.
export function discardCard(cardId: string): void {
  void request(`/api/cards/${cardId}`, { method: 'DELETE' });
}

export function verificationUrl(cardId: string): string {
  return `${location.origin}/v/${cardId}`;
}
