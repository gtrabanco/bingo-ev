// Shared gallery query logic — used by both GET /api/gallery (paginated JSON)
// and galeria.astro (SSR first-page render). Keeps the SQL, over-fetch,
// blocklist suppression, and honorific filter in one place.
import type { D1Database } from '@cloudflare/workers-types';
import { honorificFor, type Honorific, VEHICLE_TYPES, type VehicleType, unpackMarks, CELL_COUNT } from './card';
import { checkNick } from './blocklist';

export const HONORIFIC_KEYS: Honorific[] = ['resignado', 'granujilla', 'sinverguenza'];
export const PAGE_SIZE = 24;
// Over-fetch factor: post-SQL filtering (honorific, wordlist) can shrink a page.
const OVER_FETCH = 3;

export interface GalleryEntry {
  id: string;
  nick: string | null;
  completedAt: string;
  honorific: Honorific;
  vehicleType: VehicleType | null;
}

export interface GalleryRow {
  id: string;
  nick: string | null;
  completed_at: string;
  marks: string | null;
  cells: string | null;
  vehicle_type: string | null;
}

export interface GalleryParams {
  page?: number;
  honorific?: Honorific | null;
  vehicle?: VehicleType | null;
}

export interface GalleryResult {
  items: GalleryEntry[];
  hasMore: boolean;
}

function parseVehicleType(v: string | null): VehicleType | null {
  return v && (VEHICLE_TYPES as readonly string[]).includes(v) ? (v as VehicleType) : null;
}

export function rowToEntry(row: GalleryRow): GalleryEntry | null {
  let cells: (string | null)[];
  try {
    const parsed: unknown = JSON.parse(row.cells ?? 'null');
    if (!Array.isArray(parsed) || parsed.length !== CELL_COUNT) return null;
    cells = parsed.map((c) => (typeof c === 'string' ? c : null));
  } catch {
    return null;
  }
  const marks =
    row.marks && row.marks.length === CELL_COUNT
      ? unpackMarks(row.marks)
      : Array(CELL_COUNT).fill(0);

  return {
    id: row.id,
    nick: row.nick,
    completedAt: row.completed_at,
    honorific: honorificFor(cells, marks),
    vehicleType: parseVehicleType(row.vehicle_type),
  };
}

export async function queryGallery(db: D1Database, params: GalleryParams = {}): Promise<GalleryResult> {
  const page = params.page && params.page >= 1 ? params.page : 1;
  const validHonorific = params.honorific ?? null;
  const validVehicle = params.vehicle ?? null;

  const limit = PAGE_SIZE * OVER_FETCH;
  const offset = (page - 1) * PAGE_SIZE;

  let query = `
    SELECT id, nick, completed_at, marks, cells, vehicle_type
    FROM cards
    WHERE completed_at IS NOT NULL AND gallery_hidden = 0
  `;
  const bindings: (string | number)[] = [];
  let bindIdx = 1;

  if (validVehicle) {
    query += ` AND vehicle_type = ?${bindIdx++}`;
    bindings.push(validVehicle);
  }

  query += ` ORDER BY completed_at DESC LIMIT ?${bindIdx++} OFFSET ?${bindIdx++}`;
  bindings.push(limit, offset);

  const result = await db.prepare(query).bind(...bindings).all<GalleryRow>();
  const rows = result.results ?? [];

  const entries: GalleryEntry[] = [];
  for (const row of rows) {
    if (row.nick !== null && checkNick(row.nick).blocked) continue;

    const entry = rowToEntry(row);
    if (!entry) continue;

    if (validHonorific && entry.honorific !== validHonorific) continue;

    entries.push(entry);
    if (entries.length >= PAGE_SIZE + 1) break;
  }

  return {
    items: entries.slice(0, PAGE_SIZE),
    hasMore: entries.length > PAGE_SIZE,
  };
}
