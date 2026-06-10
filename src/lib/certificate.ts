// Certificate stub: renders a mock "diploma" onto a canvas and downloads it
// as a PNG. One design for everyone; only the honorific title (and its small
// print) changes with the player's behavior. Final design still pending.

import { encode } from 'uqr';
import type { Honorific } from './card';

export interface CertificateData {
  nick: string;
  date: Date; // completion date of the card
  cardId: string;
  honorific: Honorific;
}

// Canonical base for the QR and the printed link: the PNG is a shareable
// artifact, so it always points at the production domain.
export const VERIFY_BASE_URL = 'https://bingo.gruxon.com/v/';

export const CERT_WIDTH = 1200;
export const CERT_HEIGHT = 900;

const FALLBACK_NICK = 'Alguien con mucha paciencia';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, sans-serif';
const MONO = 'ui-monospace, "Courier New", monospace';

const HONORIFICS: Record<Honorific, { title: string; color: string; line: string }> = {
  resignado: {
    title: '«Resignado Sufridor»',
    color: '#11503c',
    line: 'Gracias por su comportamiento ejemplar con el resto de usuarios.',
  },
  granujilla: {
    title: '«Granujilla»',
    color: '#c07820',
    line: 'Alguna desgracia la causó usted. No todas. Algo es algo.',
  },
  sinverguenza: {
    title: '«Sinvergüenza»',
    color: '#b02e22',
    line: 'La mitad o más de las desgracias eran obra suya.',
  },
};

interface TextSpec {
  text: string;
  y: number;
  font: string;
  color: string;
  letterSpacing?: string;
  maxWidth?: number;
}

function drawCentered(ctx: CanvasRenderingContext2D, spec: TextSpec): void {
  ctx.font = spec.font;
  ctx.fillStyle = spec.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // Supported in all evergreen browsers; harmless no-op elsewhere.
  ctx.letterSpacing = spec.letterSpacing ?? '0px';
  ctx.fillText(spec.text, CERT_WIDTH / 2, spec.y, spec.maxWidth);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Verification QR, bottom-right like a diploma seal. Integer module scaling
// keeps the code crisp; the encoded matrix already includes the quiet zone.
function drawVerificationQr(ctx: CanvasRenderingContext2D, url: string): void {
  const qr = encode(url, { ecc: 'M', border: 2 });
  const scale = Math.max(1, Math.floor(150 / qr.size));
  const edge = qr.size * scale;
  const x0 = CERT_WIDTH - 78 - edge;
  const y0 = CERT_HEIGHT - 78 - edge;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0, y0, edge, edge);
  ctx.fillStyle = '#221f1a';
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.data[row]![col]) {
        ctx.fillRect(x0 + col * scale, y0 + row * scale, scale, scale);
      }
    }
  }
}

export function drawCertificate(canvas: HTMLCanvasElement, data: CertificateData): void {
  canvas.width = CERT_WIDTH;
  canvas.height = CERT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const nick = data.nick.trim().slice(0, 32) || FALLBACK_NICK;
  const honorific = HONORIFICS[data.honorific];

  // Aged-paper background with a double frame, diploma style.
  ctx.fillStyle = '#f6f0df';
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  ctx.strokeStyle = '#11503c';
  ctx.lineWidth = 9;
  ctx.strokeRect(28, 28, CERT_WIDTH - 56, CERT_HEIGHT - 56);
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, CERT_WIDTH - 96, CERT_HEIGHT - 96);

  drawCentered(ctx, {
    text: 'CERTIFICADO OFICIOSO',
    y: 134,
    font: `700 30px ${SANS}`,
    color: '#11503c',
    letterSpacing: '14px',
  });
  drawCentered(ctx, {
    text: 'DE SUPERVIVENCIA EN LA CARGA PÚBLICA',
    y: 176,
    font: `600 19px ${SANS}`,
    color: '#7c7464',
    letterSpacing: '7px',
  });

  drawCentered(ctx, {
    text: '¡BINGO!',
    y: 330,
    font: `900 150px ${SERIF}`,
    color: '#b02e22',
  });

  drawCentered(ctx, {
    text: 'Se certifica que',
    y: 408,
    font: `italic 26px ${SERIF}`,
    color: '#6b6354',
  });
  drawCentered(ctx, {
    text: nick,
    y: 468,
    font: `700 50px ${SERIF}`,
    color: '#221f1a',
    maxWidth: 1000,
  });
  ctx.strokeStyle = '#b8ab8c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(280, 488);
  ctx.lineTo(920, 488);
  ctx.stroke();

  drawCentered(ctx, {
    text: 'ha completado todas las desgracias de su cartón dentro del plazo',
    y: 534,
    font: `25px ${SERIF}`,
    color: '#3f3a33',
    maxWidth: 1000,
  });
  drawCentered(ctx, {
    text: 'reglamentario de un mes, y se le concede el título honorífico de',
    y: 570,
    font: `25px ${SERIF}`,
    color: '#3f3a33',
    maxWidth: 1000,
  });

  drawCentered(ctx, {
    text: honorific.title,
    y: 634,
    font: `700 48px ${SERIF}`,
    color: honorific.color,
    maxWidth: 720,
  });

  drawCentered(ctx, {
    text: honorific.line,
    y: 678,
    font: `italic 22px ${SERIF}`,
    color: '#6b6354',
    maxWidth: 680,
  });

  drawCentered(ctx, {
    text: `Dado en un cargador «Disponible», a ${formatDate(data.date)}.`,
    y: 730,
    font: `italic 22px ${SERIF}`,
    color: '#6b6354',
    maxWidth: 680,
  });

  drawCentered(ctx, {
    text: `Verifícalo en bingo.gruxon.com/v/${data.cardId}`,
    y: 778,
    font: `700 21px ${MONO}`,
    color: '#11503c',
    maxWidth: 860,
  });

  drawCentered(ctx, {
    text: `Cartón nº ${data.cardId} · Sin validez legal, técnica ni emocional.`,
    y: 820,
    font: `18px ${MONO}`,
    color: '#8a8170',
    maxWidth: 860,
  });

  drawVerificationQr(ctx, `${VERIFY_BASE_URL}${data.cardId}`);
}

export function downloadCertificate(canvas: HTMLCanvasElement, data: CertificateData): void {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `certificado-bingo-cargador-${data.cardId}.png`;
  link.click();
}
