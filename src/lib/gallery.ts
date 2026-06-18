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
  // null when the owning account has no public profile (or no account at all).
  profileHandle: string | null;
  // Count of the owning account's listed completed diplomas; 0 when profileHandle is null.
  siblingCount: number;
}

export interface GalleryRow {
  id: string;
  nick: string | null;
  completed_at: string;
  marks: string | null;
  cells: string | null;
  vehicle_type: string | null;
  // Present only when the gallery query includes the accounts LEFT JOIN (feature 09).
  // Absent (undefined) when the row comes from the profile page's own query.
  profile_handle?: string | null;
  sibling_count?: number;
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
    profileHandle: row.profile_handle ?? null,
    siblingCount: row.sibling_count ?? 0,
  };
}

export async function queryGallery(db: D1Database, params: GalleryParams = {}): Promise<GalleryResult> {
  const page = params.page && params.page >= 1 ? params.page : 1;
  const validHonorific = params.honorific ?? null;
  const validVehicle = params.vehicle ?? null;

  const limit = PAGE_SIZE * OVER_FETCH;
  const offset = (page - 1) * PAGE_SIZE;

  // LEFT JOIN accounts to surface the public profile handle and sibling diploma count.
  // The correlated subquery only runs when the account has a public profile (CASE guard).
  let query = `
    SELECT c.id, c.nick, c.completed_at, c.marks, c.cells, c.vehicle_type,
      CASE WHEN a.profile_public = 1 AND a.public_handle IS NOT NULL THEN a.public_handle ELSE NULL END AS profile_handle,
      CASE WHEN a.profile_public = 1 AND a.public_handle IS NOT NULL
           THEN (SELECT COUNT(*) FROM cards c2
                 WHERE c2.account_id = c.account_id
                   AND c2.completed_at IS NOT NULL AND c2.gallery_hidden = 0)
           ELSE 0 END AS sibling_count
    FROM cards c
    LEFT JOIN accounts a ON c.account_id = a.id
    WHERE c.completed_at IS NOT NULL AND c.gallery_hidden = 0
  `;
  const bindings: (string | number)[] = [];
  let bindIdx = 1;

  if (validVehicle) {
    query += ` AND c.vehicle_type = ?${bindIdx++}`;
    bindings.push(validVehicle);
  }

  query += ` ORDER BY c.completed_at DESC LIMIT ?${bindIdx++} OFFSET ?${bindIdx++}`;
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
