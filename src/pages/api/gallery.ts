// GET /api/gallery — paginated list of publicly-visible completed diplomas.
// Opt-out: every completed card is listed unless gallery_hidden = 1.
// Supports filtering by honorific tier and vehicle_type.
// Returns display-only fields — marks/cells never cross the wire.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { honorificFor, type Honorific, VEHICLE_TYPES, type VehicleType, unpackMarks, CELL_COUNT } from '../../lib/card';
import { checkNick } from '../../lib/blocklist';

const HONORIFICS: Honorific[] = ['resignado', 'granujilla', 'sinverguenza'];
const PAGE_SIZE = 24;
// Over-fetch factor: post-SQL filtering (honorific, wordlist) can shrink a page,
// so we fetch more rows than needed and trim to PAGE_SIZE.
const OVER_FETCH = 3;

export interface GalleryEntry {
  id: string;
  nick: string | null;
  completedAt: string;
  honorific: Honorific;
  vehicleType: VehicleType | null;
}

interface GalleryRow {
  id: string;
  nick: string | null;
  completed_at: string;
  marks: string | null;
  cells: string | null;
  vehicle_type: string | null;
}

function parseVehicleType(v: string | null): VehicleType | null {
  return v && (VEHICLE_TYPES as readonly string[]).includes(v) ? (v as VehicleType) : null;
}

function rowToEntry(row: GalleryRow): GalleryEntry | null {
  let cells: (string | null)[];
  try {
    const parsed: unknown = JSON.parse(row.cells ?? 'null');
    if (!Array.isArray(parsed) || parsed.length !== CELL_COUNT) return null;
    cells = parsed.map((c) => (typeof c === 'string' ? c : null));
  } catch {
    return null;
  }
  const marks = row.marks && row.marks.length === CELL_COUNT
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

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const honorificFilter = url.searchParams.get('honorific');
  const vehicleFilter = url.searchParams.get('vehicle');

  const validHonorific = honorificFilter && (HONORIFICS as string[]).includes(honorificFilter)
    ? (honorificFilter as Honorific)
    : null;
  const validVehicle = vehicleFilter && (VEHICLE_TYPES as readonly string[]).includes(vehicleFilter)
    ? (vehicleFilter as VehicleType)
    : null;

  const db = env.DB;

  // Fetch an over-sized window to account for post-SQL filtering (honorific
  // is computed in the Worker; wordlist suppression also happens here).
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

  const stmt = db.prepare(query);
  const result = await stmt.bind(...bindings).all<GalleryRow>();
  const rows = result.results ?? [];

  // Convert rows to entries, computing honorific and filtering.
  const entries: GalleryEntry[] = [];
  for (const row of rows) {
    // Read-time wordlist suppression: pre-existing blocked nicks are hidden.
    if (row.nick !== null) {
      const check = checkNick(row.nick);
      if (check.blocked) continue;
    }

    const entry = rowToEntry(row);
    if (!entry) continue;

    // Apply honorific filter (computed in Worker, not expressible in SQL).
    if (validHonorific && entry.honorific !== validHonorific) continue;

    entries.push(entry);
    if (entries.length >= PAGE_SIZE + 1) break;
  }

  const hasMore = entries.length > PAGE_SIZE;
  const items = entries.slice(0, PAGE_SIZE);

  // Build counts over this page for the UI (cheap at this scale).
  const counts = {
    honorific: Object.fromEntries(HONORIFICS.map((h) => [h, 0])) as Record<Honorific, number>,
    vehicle: Object.fromEntries(VEHICLE_TYPES.map((v) => [v, 0])) as Record<VehicleType, number>,
  };
  for (const item of items) {
    counts.honorific[item.honorific]++;
    if (item.vehicleType) counts.vehicle[item.vehicleType]++;
  }

  return Response.json({ items, total: items.length, counts, hasMore, page });
};
