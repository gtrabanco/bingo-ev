// GET /api/gallery — paginated list of publicly-visible completed diplomas.
// Opt-out: every completed card is listed unless gallery_hidden = 1.
// Supports filtering by honorific tier and vehicle_type.
// Returns display-only fields — marks/cells never cross the wire.
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { type Honorific, VEHICLE_TYPES, type VehicleType } from '../../lib/card';
import { queryGallery, HONORIFIC_KEYS, type GalleryEntry } from '../../lib/gallery';

export type { GalleryEntry };

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const honorificFilter = url.searchParams.get('honorific');
  const vehicleFilter = url.searchParams.get('vehicle');

  const validHonorific = honorificFilter && (HONORIFIC_KEYS as string[]).includes(honorificFilter)
    ? (honorificFilter as Honorific)
    : null;
  const validVehicle = vehicleFilter && (VEHICLE_TYPES as readonly string[]).includes(vehicleFilter)
    ? (vehicleFilter as VehicleType)
    : null;

  const { items, hasMore } = await queryGallery(env.DB, {
    page,
    honorific: validHonorific,
    vehicle: validVehicle,
  });

  // Build per-page counts for future filter-badge UI.
  const counts = {
    honorific: Object.fromEntries(HONORIFIC_KEYS.map((h) => [h, 0])) as Record<Honorific, number>,
    vehicle: Object.fromEntries(VEHICLE_TYPES.map((v) => [v, 0])) as Record<VehicleType, number>,
  };
  for (const item of items) {
    counts.honorific[item.honorific]++;
    if (item.vehicleType) counts.vehicle[item.vehicleType]++;
  }

  return Response.json({ items, count: items.length, counts, hasMore, page });
};
