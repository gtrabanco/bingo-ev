// Shared loader for all OG diploma endpoints (landscape + portrait, SVG + PNG).
// Consolidates the D1 query, ID validation, mark unpacking, and date formatting
// that was duplicated across four endpoint files.

import { env } from 'cloudflare:workers';
import { honorificFor, unpackMarks } from './card';
import { FALLBACK_NICK } from './certificate-design';
import type { DiplomaSvgData } from './og-image';

export const ID_PATTERN = /^[0-9a-z]{8}$/;

const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

interface DiplomaRow {
  completed_at: string;
  nick: string | null;
  marks: string | null;
  cells: string | null;
}

export async function loadDiplomaData(id: string): Promise<DiplomaSvgData | null> {
  const row = await env.DB.prepare(
    'SELECT nick, completed_at, marks, cells FROM cards WHERE id = ?1 AND completed_at IS NOT NULL',
  )
    .bind(id)
    .first<DiplomaRow>();

  if (!row) return null;

  const marks = row.marks ? unpackMarks(row.marks) : [];
  const cells: (string | null)[] = row.cells ? JSON.parse(row.cells) : [];

  return {
    nick: row.nick || FALLBACK_NICK,
    date: longDate.format(new Date(row.completed_at)),
    cardId: id,
    honorific: honorificFor(cells, marks),
  };
}
