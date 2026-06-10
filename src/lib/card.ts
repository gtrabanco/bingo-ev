// Card generation, modeled after a real Spanish bingo card ("cartón"):
// a 3x4 grid where each row holds 2 situations and 2 blanks, like the
// number/blank mix of a 90-ball cartón. Blanks are dead cells.
//
// The chosen situation ids are stored alongside the marks so a saved card
// keeps rendering correctly even if situations.json changes later.
import situationsData from '../data/situations.json';

export interface Situation {
  id: string;
  text: string;
}

export interface CardState {
  id: string;
  createdAt: string; // ISO timestamp
  completedAt: string | null; // ISO timestamp of the first full completion
  cells: (string | null)[]; // 12 entries, row-major; null = blank cell
  marks: boolean[]; // mark state per cell, same order; blanks stay false
}

export const ROWS = 3;
export const COLS = 4;
export const CELL_COUNT = ROWS * COLS;
export const SITUATIONS_PER_ROW = 2;
export const SITUATION_COUNT = ROWS * SITUATIONS_PER_ROW;

// Days are irregular, months more so: "one month" means same day next month,
// clamped to that month's last day (Jan 31 -> Feb 28).
export const EXPIRY_MONTHS = 1;

export const situations: Situation[] = situationsData;

const byId = new Map(situations.map((situation) => [situation.id, situation]));

export function getSituation(id: string): Situation | undefined {
  return byId.get(id);
}

// Short serial for the card. Not cryptographic identity, just an id with a
// collision chance low enough for one browser's localStorage.
export function newCardId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join('');
}

function shuffled<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function generateCard(): CardState {
  const chosen = shuffled(situations).slice(0, SITUATION_COUNT);
  const cells: (string | null)[] = Array(CELL_COUNT).fill(null);

  let cursor = 0;
  for (let row = 0; row < ROWS; row++) {
    const columns = shuffled([...Array(COLS).keys()])
      .slice(0, SITUATIONS_PER_ROW)
      .sort((a, b) => a - b);
    for (const col of columns) {
      cells[row * COLS + col] = chosen[cursor++]!.id;
    }
  }

  return {
    id: newCardId(),
    createdAt: new Date().toISOString(),
    completedAt: null,
    cells,
    marks: Array(CELL_COUNT).fill(false),
  };
}

// Shared by the browser and the Worker so both clocks agree on the rule.
export function expiryFromCreatedAt(createdAt: string): Date {
  const created = new Date(createdAt);
  const expiry = new Date(created);
  expiry.setMonth(expiry.getMonth() + EXPIRY_MONTHS);
  // setMonth overflows short months (Jan 31 -> Mar 3); clamp to month end.
  if (expiry.getDate() !== created.getDate()) expiry.setDate(0);
  return expiry;
}

export function expiryDate(card: CardState): Date {
  return expiryFromCreatedAt(card.createdAt);
}

// A card only expires while incomplete: a bingo sung in time stays sung.
export function isExpired(card: CardState, now: Date = new Date()): boolean {
  return card.completedAt === null && now.getTime() > expiryDate(card).getTime();
}

// A stored card is only usable if it has the right shape AND every referenced
// situation still exists in the current pool; otherwise the caller should
// generate a fresh card. Cards from older layouts fail here by design.
export function isValidCard(value: unknown): value is CardState {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Partial<CardState>;
  return (
    typeof card.id === 'string' &&
    card.id.length > 0 &&
    typeof card.createdAt === 'string' &&
    !Number.isNaN(Date.parse(card.createdAt)) &&
    (card.completedAt === null ||
      (typeof card.completedAt === 'string' && !Number.isNaN(Date.parse(card.completedAt)))) &&
    Array.isArray(card.cells) &&
    card.cells.length === CELL_COUNT &&
    card.cells.every((cell) => cell === null || (typeof cell === 'string' && byId.has(cell))) &&
    card.cells.some((cell) => cell !== null) &&
    Array.isArray(card.marks) &&
    card.marks.length === CELL_COUNT &&
    card.marks.every((mark) => typeof mark === 'boolean')
  );
}
