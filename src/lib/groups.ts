// Shared bits for bingo groups. The hashing runs server-side (Workers'
// Web Crypto) — passwords travel same-origin in the clear and are only ever
// stored hashed, salted with the group id so the same password in two groups
// produces different hashes.
import { env } from 'cloudflare:workers';

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

// Housekeeping after a card leaves a room, voluntarily (leave) or not (kick).
// Each statement checks CURRENT state — no pre-reads, so races with joins and
// completions can't leave the room inconsistent:
// 1. The trophy stays with the room, not the card: if the departed card held
//    winner_card_id, the win is vacated and the room reopens (the diploma
//    lives on the card and survives).
// 2. If the departed card held the office, ownership passes to the most
//    veteran remaining member (oldest card). Empty subquery -> NULL, which
//    the next step erases anyway.
// 3. A room with nobody left in it dissolves.
// Defense in depth for the ownership invariant: heals rooms whose owner card
// row no longer exists (expired, regenerated, swept by GC before settling).
// The office passes to the oldest remaining member, or NULL when the room is
// empty (the memberless-room GC sweeps those later). Idempotent; piggybacked
// on the opportunistic GC batches.
export function orphanedOwnerRepair() {
  return env.DB.prepare(
    `UPDATE groups SET owner_card_id = (
       SELECT id FROM cards WHERE group_id = groups.id ORDER BY created_at, id LIMIT 1
     )
     WHERE owner_card_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM cards WHERE id = groups.owner_card_id)`,
  );
}

export async function settleDeparture(groupId: string, departedCardId: string): Promise<void> {
  await env.DB.prepare(
    'UPDATE groups SET winner_card_id = NULL WHERE id = ?1 AND winner_card_id = ?2',
  )
    .bind(groupId, departedCardId)
    .run();
  await env.DB.prepare(
    `UPDATE groups SET owner_card_id = (
       SELECT id FROM cards WHERE group_id = ?1 ORDER BY created_at, id LIMIT 1
     )
     WHERE id = ?1 AND owner_card_id = ?2`,
  )
    .bind(groupId, departedCardId)
    .run();
  await env.DB.prepare(
    'DELETE FROM groups WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM cards WHERE group_id = ?1)',
  )
    .bind(groupId)
    .run();
}
