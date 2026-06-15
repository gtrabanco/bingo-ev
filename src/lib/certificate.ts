// Renders the diploma onto a canvas and downloads it as a PNG.
// One design for everyone; only the honorific title (and its small
// print) changes with the player's behavior. Final design still pending.

import { encode } from 'uqr';
import type { Honorific } from './card';
import { PALETTE, SERIF, SANS, MONO, HONORIFICS, FALLBACK_NICK, COPY } from './certificate-design';

export type { Honorific };

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
  ctx.fillStyle = PALETTE.ink;
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
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  ctx.strokeStyle = PALETTE.frameGreen;
  ctx.lineWidth = 9;
  ctx.strokeRect(28, 28, CERT_WIDTH - 56, CERT_HEIGHT - 56);
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, CERT_WIDTH - 96, CERT_HEIGHT - 96);

  drawCentered(ctx, {
    text: COPY.eyebrow1,
    y: 134,
    font: `700 30px ${SANS}`,
    color: PALETTE.frameGreen,
    letterSpacing: '14px',
  });
  drawCentered(ctx, {
    text: COPY.eyebrow2,
    y: 176,
    font: `600 19px ${SANS}`,
    color: PALETTE.mutedMid,
    letterSpacing: '7px',
  });

  drawCentered(ctx, {
    text: '¡BINGO!',
    y: 330,
    font: `900 150px ${SERIF}`,
    color: PALETTE.dauberRed,
  });

  drawCentered(ctx, {
    text: COPY.certifying,
    y: 408,
    font: `italic 26px ${SERIF}`,
    color: PALETTE.mutedDark,
  });
  drawCentered(ctx, {
    text: nick,
    y: 468,
    font: `700 50px ${SERIF}`,
    color: PALETTE.ink,
    maxWidth: 1000,
  });
  ctx.strokeStyle = PALETTE.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(280, 488);
  ctx.lineTo(920, 488);
  ctx.stroke();

  drawCentered(ctx, {
    text: COPY.body1,
    y: 534,
    font: `25px ${SERIF}`,
    color: PALETTE.body,
    maxWidth: 1000,
  });
  drawCentered(ctx, {
    text: COPY.body2,
    y: 570,
    font: `25px ${SERIF}`,
    color: PALETTE.body,
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
    color: PALETTE.mutedDark,
    maxWidth: 680,
  });

  drawCentered(ctx, {
    text: COPY.issuedAt(formatDate(data.date)),
    y: 730,
    font: `italic 22px ${SERIF}`,
    color: PALETTE.mutedDark,
    maxWidth: 680,
  });

  drawCentered(ctx, {
    text: COPY.verifyLabel(data.cardId),
    y: 778,
    font: `700 21px ${MONO}`,
    color: PALETTE.frameGreen,
    maxWidth: 860,
  });

  drawCentered(ctx, {
    text: COPY.footer(data.cardId),
    y: 820,
    font: `18px ${MONO}`,
    color: PALETTE.mutedLight,
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
