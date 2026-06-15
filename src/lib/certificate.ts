// Renders the diploma onto a canvas and downloads it as a PNG.
// One design for everyone; only the honorific title (and its small
// print) changes with the player's behavior.

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

// ── Drawing helpers ───────────────────────────────────────────────────────────

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

// Rounded-rect path helper (avoids reliance on ctx.roundRect availability).
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Frame with corner ornaments: outer thick line + inner thin line +
// decorative cross/diamond at each inner-frame corner.
function drawFrame(ctx: CanvasRenderingContext2D): void {
  // Outer bold line
  ctx.strokeStyle = PALETTE.frameGreen;
  ctx.lineWidth = 9;
  ctx.strokeRect(28, 28, CERT_WIDTH - 56, CERT_HEIGHT - 56);
  // Inner thin line
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 48, CERT_WIDTH - 96, CERT_HEIGHT - 96);

  // Corner ornaments at the four corners of the inner frame.
  const corners: [number, number][] = [
    [48, 48],
    [CERT_WIDTH - 48, 48],
    [48, CERT_HEIGHT - 48],
    [CERT_WIDTH - 48, CERT_HEIGHT - 48],
  ];

  ctx.fillStyle = PALETTE.frameGreen;
  ctx.lineWidth = 1.5;

  for (const [cx, cy] of corners) {
    // Small filled diamond at the corner junction.
    const d = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - d);
    ctx.lineTo(cx + d, cy);
    ctx.lineTo(cx, cy + d);
    ctx.lineTo(cx - d, cy);
    ctx.closePath();
    ctx.fill();

    // Four short tick arms extending from the diamond tips.
    const arm = 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy - d);   ctx.lineTo(cx, cy - arm);
    ctx.moveTo(cx, cy + d);   ctx.lineTo(cx, cy + arm);
    ctx.moveTo(cx - d, cy);   ctx.lineTo(cx - arm, cy);
    ctx.moveTo(cx + d, cy);   ctx.lineTo(cx + arm, cy);
    ctx.stroke();
  }
}

// Honorific seal: a rotated double-border badge echoing the `.expired-stamp`
// component (CSS `border: 4px double`, `rotate(-12deg)`, paper background).
// Uses a gentler rotation so it reads clearly as a diploma seal.
function drawHonorifcSeal(
  ctx: CanvasRenderingContext2D,
  honorific: { title: string; color: string },
): void {
  const cx = CERT_WIDTH / 2;
  const cy = 638;
  const W = 560;
  const H = 76;
  const R = 8;
  const ANGLE = -0.065; // ≈ −3.7°

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ANGLE);

  // Semi-transparent paper background with a hint of the honorific color.
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = honorific.color;
  roundedRectPath(ctx, -W / 2, -H / 2, W, H, R);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Outer border line.
  ctx.strokeStyle = honorific.color;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, -W / 2, -H / 2, W, H, R);
  ctx.stroke();

  // Inner border line (gap = 5px on each side, simulating CSS "double").
  ctx.lineWidth = 1;
  roundedRectPath(ctx, -W / 2 + 6, -H / 2 + 6, W - 12, H - 12, R - 3);
  ctx.stroke();

  // Title text centered inside the seal.
  ctx.font = `700 44px ${SERIF}`;
  ctx.fillStyle = honorific.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '1px';
  ctx.fillText(honorific.title, 0, 2, W - 24);

  ctx.restore();
}

// Verification QR in the bottom-right corner, framed like a seal.
// Integer module scaling keeps modules crisp; the encoded matrix already
// includes the quiet zone.
function drawVerificationQr(ctx: CanvasRenderingContext2D, url: string, cardId: string): void {
  const qr = encode(url, { ecc: 'M', border: 2 });
  const scale = Math.max(1, Math.floor(150 / qr.size));
  const edge = qr.size * scale;
  const margin = 62;
  const x0 = CERT_WIDTH - margin - edge;
  const y0 = CERT_HEIGHT - margin - edge;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0, y0, edge, edge);

  // QR modules
  ctx.fillStyle = PALETTE.ink;
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.data[row]![col]) {
        ctx.fillRect(x0 + col * scale, y0 + row * scale, scale, scale);
      }
    }
  }

  // Thin framing border around the QR
  ctx.strokeStyle = PALETTE.frameGreen;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0 - 3, y0 - 3, edge + 6, edge + 6);

  // Small "VERIFICAR" label below the QR
  ctx.font = `600 11px ${SANS}`;
  ctx.fillStyle = PALETTE.frameGreen;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '2px';
  ctx.fillText('VERIFICAR', x0 + edge / 2, y0 + edge + 18);
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function drawCertificate(canvas: HTMLCanvasElement, data: CertificateData): void {
  canvas.width = CERT_WIDTH;
  canvas.height = CERT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const nick = data.nick.trim().slice(0, 32) || FALLBACK_NICK;
  const honorific = HONORIFICS[data.honorific];

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

  // ── Frame + corner ornaments ─────────────────────────────────────────────────
  drawFrame(ctx);

  // ── Eyebrow ──────────────────────────────────────────────────────────────────
  drawCentered(ctx, {
    text: COPY.eyebrow1,
    y: 126,
    font: `700 28px ${SANS}`,
    color: PALETTE.frameGreen,
    letterSpacing: '14px',
  });
  drawCentered(ctx, {
    text: COPY.eyebrow2,
    y: 164,
    font: `600 17px ${SANS}`,
    color: PALETTE.mutedMid,
    letterSpacing: '6px',
  });

  // Thin rule below eyebrow
  ctx.strokeStyle = PALETTE.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, 180);
  ctx.lineTo(CERT_WIDTH - 180, 180);
  ctx.stroke();

  // ── ¡BINGO! ───────────────────────────────────────────────────────────────────
  drawCentered(ctx, {
    text: '¡BINGO!',
    y: 340,
    font: `900 160px ${SERIF}`,
    color: PALETTE.dauberRed,
  });

  // ── Certifying block ──────────────────────────────────────────────────────────
  drawCentered(ctx, {
    text: COPY.certifying,
    y: 415,
    font: `italic 26px ${SERIF}`,
    color: PALETTE.mutedDark,
  });
  drawCentered(ctx, {
    text: nick,
    y: 474,
    font: `700 52px ${SERIF}`,
    color: PALETTE.ink,
    maxWidth: 980,
  });

  // Name underline
  ctx.strokeStyle = PALETTE.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(240, 493);
  ctx.lineTo(CERT_WIDTH - 240, 493);
  ctx.stroke();

  drawCentered(ctx, {
    text: COPY.body1,
    y: 538,
    font: `24px ${SERIF}`,
    color: PALETTE.body,
    maxWidth: 980,
  });
  drawCentered(ctx, {
    text: COPY.body2,
    y: 572,
    font: `24px ${SERIF}`,
    color: PALETTE.body,
    maxWidth: 980,
  });

  // ── Honorific seal ───────────────────────────────────────────────────────────
  drawHonorifcSeal(ctx, honorific);

  // Honorific small print below the seal
  drawCentered(ctx, {
    text: honorific.line,
    y: 700,
    font: `italic 21px ${SERIF}`,
    color: PALETTE.mutedDark,
    maxWidth: 680,
  });

  // ── Footer ────────────────────────────────────────────────────────────────────
  drawCentered(ctx, {
    text: COPY.issuedAt(formatDate(data.date)),
    y: 748,
    font: `italic 21px ${SERIF}`,
    color: PALETTE.mutedDark,
    maxWidth: 720,
  });

  // Thin rule above the verify URL
  ctx.strokeStyle = PALETTE.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, 768);
  ctx.lineTo(CERT_WIDTH - 180, 768);
  ctx.stroke();

  drawCentered(ctx, {
    text: COPY.verifyLabel(data.cardId),
    y: 800,
    font: `700 20px ${MONO}`,
    color: PALETTE.frameGreen,
    maxWidth: 800,
  });

  drawCentered(ctx, {
    text: COPY.footer(data.cardId),
    y: 840,
    font: `17px ${MONO}`,
    color: PALETTE.mutedLight,
    maxWidth: 800,
  });

  // ── QR seal ───────────────────────────────────────────────────────────────────
  drawVerificationQr(ctx, `${VERIFY_BASE_URL}${data.cardId}`, data.cardId);
}

export function downloadCertificate(canvas: HTMLCanvasElement, data: CertificateData): void {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `certificado-bingo-cargador-${data.cardId}.png`;
  link.click();
}
