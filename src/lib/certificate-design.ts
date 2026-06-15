// Shared design tokens consumed by both certificate renderers:
// src/lib/certificate.ts (canvas PNG) and src/lib/og-image.ts (SVG OG card).
// Changing a value here propagates to both outputs.

import type { Honorific } from './card';

// ── Palette ──────────────────────────────────────────────────────────────────

export const PALETTE = {
  paper: '#f6f0df',
  frameGreen: '#11503c',
  dauberRed: '#b02e22',
  ink: '#221f1a',
  body: '#3f3a33',
  mutedDark: '#6b6354',
  mutedMid: '#7c7464',
  mutedLight: '#8a8170',
  rule: '#b8ab8c',
  honorificGranujilla: '#c07820',
} as const;

// ── Font stacks ───────────────────────────────────────────────────────────────

export const SERIF = 'Georgia, "Times New Roman", serif';
export const SANS = 'system-ui, sans-serif';
export const MONO = 'ui-monospace, "Courier New", monospace';

// ── Honorifics ────────────────────────────────────────────────────────────────

export const HONORIFICS: Record<Honorific, { title: string; color: string; line: string }> = {
  resignado: {
    title: '«Resignado Sufridor»',
    color: PALETTE.frameGreen,
    line: 'Gracias por su comportamiento ejemplar con el resto de usuarios.',
  },
  granujilla: {
    title: '«Granujilla»',
    color: PALETTE.honorificGranujilla,
    line: 'Alguna desgracia la causó usted. No todas. Algo es algo.',
  },
  sinverguenza: {
    title: '«Sinvergüenza»',
    color: PALETTE.dauberRed,
    line: 'La mitad o más de las desgracias eran obra suya.',
  },
};

// ── Copy ─────────────────────────────────────────────────────────────────────

export const FALLBACK_NICK = 'Alguien con mucha paciencia';

export const COPY = {
  eyebrow1: 'CERTIFICADO OFICIOSO',
  eyebrow2: 'DE SUPERVIVENCIA EN LA CARGA PÚBLICA',
  certifying: 'Se certifica que',
  body1: 'ha completado todas las desgracias de su cartón dentro del plazo',
  body2: 'reglamentario de un mes, y se le concede el título honorífico de',
  issuedAt: (date: string) => `Dado en un cargador «Disponible», a ${date}.`,
  verifyLabel: (cardId: string) => `Verifícalo en bingo.gruxon.com/v/${cardId}`,
  footer: (cardId: string) => `Cartón nº ${cardId} · Sin validez legal, técnica ni emocional.`,
} as const;
