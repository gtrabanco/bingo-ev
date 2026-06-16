// Open Graph image generation (SVG for lightness and Workers compatibility).

import { encode } from 'uqr';
import type { Honorific } from './card';
import { PALETTE, SERIF, SANS, MONO, HONORIFICS, COPY, VERIFY_BASE_URL } from './certificate-design';

const WIDTH = 1200;
const HEIGHT = 630;
const CX = WIDTH / 2; // 600

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_CX = STORY_WIDTH / 2; // 540

export interface DiplomaSvgData {
  nick: string;
  date: string;
  cardId: string;
  honorific: Honorific;
}

// Corner ornament at a single corner: filled diamond + 4 cross arms.
function cornerOrnament(cx: number, cy: number): string {
  const d = 6;
  const arm = 14;
  return `<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}" fill="${PALETTE.frameGreen}"/>
    <line x1="${cx}" y1="${cy - d}" x2="${cx}" y2="${cy - arm}" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>
    <line x1="${cx}" y1="${cy + d}" x2="${cx}" y2="${cy + arm}" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>
    <line x1="${cx - d}" y1="${cy}" x2="${cx - arm}" y2="${cy}" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>
    <line x1="${cx + d}" y1="${cy}" x2="${cx + arm}" y2="${cy}" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>`;
}

function allCornerOrnaments(w: number, h: number): string {
  const inset = 40;
  return [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ].map(([x, y]) => cornerOrnament(x, y)).join('\n  ');
}

// QR verification seal in the bottom-right corner of the OG diploma.
// Mirrors the canvas drawVerificationQr() in certificate.ts but outputs SVG rects.
function verifyQrSvg(cardId: string): string {
  const url = `${VERIFY_BASE_URL}${cardId}`;
  const qr = encode(url, { ecc: 'M', border: 2 });
  const scale = Math.max(1, Math.floor(100 / qr.size));
  const edge = qr.size * scale;

  // Place in bottom-right corner, inside the inner frame (right=1160, bottom=590).
  const gutter = 20;
  const labelGap = 15;
  const x0 = WIDTH - 40 - gutter - edge;
  const y0 = HEIGHT - 40 - gutter - labelGap - edge;
  const labelX = x0 + edge / 2;
  const labelY = y0 + edge + labelGap;

  const rects: string[] = [];
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.data[row]![col]) {
        rects.push(
          `<rect x="${x0 + col * scale}" y="${y0 + row * scale}" width="${scale}" height="${scale}" fill="${PALETTE.ink}"/>`,
        );
      }
    }
  }

  return `
  <!-- QR verification seal -->
  <rect x="${x0}" y="${y0}" width="${edge}" height="${edge}" fill="#ffffff"/>
  ${rects.join('\n  ')}
  <rect x="${x0 - 3}" y="${y0 - 3}" width="${edge + 6}" height="${edge + 6}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>
  <text x="${labelX}" y="${labelY}" font-family="${SANS}" font-size="11" font-weight="600" fill="${PALETTE.frameGreen}" text-anchor="middle" letter-spacing="2">VERIFICAR</text>`;
}

export function diplomaSvg(data: DiplomaSvgData): string {
  const hon = HONORIFICS[data.honorific];

  // Seal geometry — centered at (CX, 438), rotated −3.7°.
  const sealW = 540;
  const sealH = 72;
  const sealX = CX - sealW / 2;
  const sealY = 402;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">

  <!-- Background: aged paper -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PALETTE.paper}"/>

  <!-- Frame: outer bold + inner thin -->
  <rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="9"/>
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>

  <!-- Corner ornaments -->
  ${allCornerOrnaments(WIDTH, HEIGHT)}

  <!-- Eyebrow -->
  <text x="${CX}" y="64" font-family="${SANS}" font-size="21" font-weight="700" fill="${PALETTE.frameGreen}" text-anchor="middle" letter-spacing="12">${COPY.eyebrow1}</text>
  <text x="${CX}" y="90" font-family="${SANS}" font-size="13" font-weight="600" fill="${PALETTE.mutedMid}" text-anchor="middle" letter-spacing="5">${COPY.eyebrow2}</text>
  <line x1="200" y1="106" x2="${WIDTH - 200}" y2="106" stroke="${PALETTE.rule}" stroke-width="1"/>

  <!-- ¡BINGO! -->
  <text x="${CX}" y="228" font-family="${SERIF}" font-size="124" font-weight="900" fill="${PALETTE.dauberRed}" text-anchor="middle">&#xA1;BINGO!</text>

  <!-- Certifying block -->
  <text x="${CX}" y="272" font-family="${SERIF}" font-size="21" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${COPY.certifying}</text>
  <text x="${CX}" y="318" font-family="${SERIF}" font-size="40" font-weight="700" fill="${PALETTE.ink}" text-anchor="middle">${escapeXml(data.nick)}</text>
  <line x1="240" y1="334" x2="${WIDTH - 240}" y2="334" stroke="${PALETTE.rule}" stroke-width="2"/>
  <text x="${CX}" y="365" font-family="${SERIF}" font-size="19" fill="${PALETTE.body}" text-anchor="middle">${COPY.body1}</text>
  <text x="${CX}" y="390" font-family="${SERIF}" font-size="19" fill="${PALETTE.body}" text-anchor="middle">${COPY.body2}</text>

  <!-- Honorific seal: double-border rounded badge, rotated −3.7° -->
  <g transform="rotate(-3.7, ${CX}, ${sealY + sealH / 2})">
    <rect x="${sealX}" y="${sealY}" width="${sealW}" height="${sealH}" rx="8" fill="${hon.color}" fill-opacity="0.12"/>
    <rect x="${sealX}" y="${sealY}" width="${sealW}" height="${sealH}" rx="8" fill="none" stroke="${hon.color}" stroke-width="2"/>
    <rect x="${sealX + 6}" y="${sealY + 6}" width="${sealW - 12}" height="${sealH - 12}" rx="5" fill="none" stroke="${hon.color}" stroke-width="1"/>
    <text x="${CX}" y="${sealY + sealH / 2 + 2}" font-family="${SERIF}" font-size="36" font-weight="700" fill="${hon.color}" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${escapeXml(hon.title)}</text>
  </g>

  <!-- Honorific small print -->
  <text x="${CX}" y="498" font-family="${SERIF}" font-size="17" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${escapeXml(hon.line)}</text>

  <!-- Issued date -->
  <text x="${CX}" y="524" font-family="${SERIF}" font-size="17" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${escapeXml(COPY.issuedAt(data.date))}</text>

  <!-- Rule above verify URL -->
  <line x1="200" y1="542" x2="${WIDTH - 200}" y2="542" stroke="${PALETTE.rule}" stroke-width="1"/>

  <!-- Verify URL (text for legibility at small sizes) -->
  <text x="${CX}" y="572" font-family="${MONO}" font-size="17" font-weight="700" fill="${PALETTE.frameGreen}" text-anchor="middle">${escapeXml(COPY.verifyLabel(data.cardId))}</text>
  ${verifyQrSvg(data.cardId)}

</svg>`;
}

// Portrait (9:16) QR, centered — for the Story variant.
function storyCenteredQrSvg(cardId: string): string {
  const url = `${VERIFY_BASE_URL}${cardId}`;
  const qr = encode(url, { ecc: 'M', border: 2 });
  const scale = Math.max(1, Math.floor(280 / qr.size));
  const edge = qr.size * scale;

  const x0 = (STORY_WIDTH - edge) / 2;
  const y0 = 1195;
  const labelY = y0 + edge + 20;

  const rects: string[] = [];
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.data[row]![col]) {
        rects.push(
          `<rect x="${x0 + col * scale}" y="${y0 + row * scale}" width="${scale}" height="${scale}" fill="${PALETTE.ink}"/>`,
        );
      }
    }
  }

  return `
  <!-- QR verification seal (centered, portrait) -->
  <rect x="${x0}" y="${y0}" width="${edge}" height="${edge}" fill="#ffffff"/>
  ${rects.join('\n  ')}
  <rect x="${x0 - 3}" y="${y0 - 3}" width="${edge + 6}" height="${edge + 6}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>
  <text x="${STORY_CX}" y="${labelY}" font-family="${SANS}" font-size="13" font-weight="600" fill="${PALETTE.frameGreen}" text-anchor="middle" letter-spacing="3">VERIFICAR</text>`;
}

export function diplomaStorySvg(data: DiplomaSvgData): string {
  const hon = HONORIFICS[data.honorific];

  const sealW = 820;
  const sealH = 88;
  const sealX = STORY_CX - sealW / 2;
  const sealY = 840;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STORY_WIDTH} ${STORY_HEIGHT}">

  <!-- Background: aged paper -->
  <rect width="${STORY_WIDTH}" height="${STORY_HEIGHT}" fill="${PALETTE.paper}"/>

  <!-- Frame: outer bold + inner thin -->
  <rect x="20" y="20" width="${STORY_WIDTH - 40}" height="${STORY_HEIGHT - 40}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="9"/>
  <rect x="40" y="40" width="${STORY_WIDTH - 80}" height="${STORY_HEIGHT - 80}" fill="none" stroke="${PALETTE.frameGreen}" stroke-width="1.5"/>

  <!-- Corner ornaments -->
  ${allCornerOrnaments(STORY_WIDTH, STORY_HEIGHT)}

  <!-- Eyebrow -->
  <text x="${STORY_CX}" y="80" font-family="${SANS}" font-size="26" font-weight="700" fill="${PALETTE.frameGreen}" text-anchor="middle" letter-spacing="10">${COPY.eyebrow1}</text>
  <text x="${STORY_CX}" y="112" font-family="${SANS}" font-size="15" font-weight="600" fill="${PALETTE.mutedMid}" text-anchor="middle" letter-spacing="5">${COPY.eyebrow2}</text>
  <line x1="120" y1="136" x2="${STORY_WIDTH - 120}" y2="136" stroke="${PALETTE.rule}" stroke-width="1"/>

  <!-- ¡BINGO! -->
  <text x="${STORY_CX}" y="430" font-family="${SERIF}" font-size="175" font-weight="900" fill="${PALETTE.dauberRed}" text-anchor="middle">&#xA1;BINGO!</text>

  <!-- Certifying block -->
  <text x="${STORY_CX}" y="520" font-family="${SERIF}" font-size="26" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${COPY.certifying}</text>
  <text x="${STORY_CX}" y="615" font-family="${SERIF}" font-size="56" font-weight="700" fill="${PALETTE.ink}" text-anchor="middle">${escapeXml(data.nick)}</text>
  <line x1="140" y1="655" x2="${STORY_WIDTH - 140}" y2="655" stroke="${PALETTE.rule}" stroke-width="2"/>
  <text x="${STORY_CX}" y="720" font-family="${SERIF}" font-size="24" fill="${PALETTE.body}" text-anchor="middle">${COPY.body1}</text>
  <text x="${STORY_CX}" y="760" font-family="${SERIF}" font-size="24" fill="${PALETTE.body}" text-anchor="middle">${COPY.body2}</text>

  <!-- Honorific seal: double-border rounded badge, rotated −3.7° -->
  <g transform="rotate(-3.7, ${STORY_CX}, ${sealY + sealH / 2})">
    <rect x="${sealX}" y="${sealY}" width="${sealW}" height="${sealH}" rx="8" fill="${hon.color}" fill-opacity="0.12"/>
    <rect x="${sealX}" y="${sealY}" width="${sealW}" height="${sealH}" rx="8" fill="none" stroke="${hon.color}" stroke-width="2"/>
    <rect x="${sealX + 6}" y="${sealY + 6}" width="${sealW - 12}" height="${sealH - 12}" rx="5" fill="none" stroke="${hon.color}" stroke-width="1"/>
    <text x="${STORY_CX}" y="${sealY + sealH / 2 + 2}" font-family="${SERIF}" font-size="42" font-weight="700" fill="${hon.color}" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${escapeXml(hon.title)}</text>
  </g>

  <!-- Honorific small print -->
  <text x="${STORY_CX}" y="1040" font-family="${SERIF}" font-size="22" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${escapeXml(hon.line)}</text>

  <!-- Issued date -->
  <text x="${STORY_CX}" y="1080" font-family="${SERIF}" font-size="22" font-style="italic" fill="${PALETTE.mutedDark}" text-anchor="middle">${escapeXml(COPY.issuedAt(data.date))}</text>

  <!-- Rule above QR -->
  <line x1="120" y1="1115" x2="${STORY_WIDTH - 120}" y2="1115" stroke="${PALETTE.rule}" stroke-width="1"/>

  ${storyCenteredQrSvg(data.cardId)}

  <!-- Verify URL -->
  <text x="${STORY_CX}" y="1545" font-family="${MONO}" font-size="20" font-weight="700" fill="${PALETTE.frameGreen}" text-anchor="middle">${escapeXml(COPY.verifyLabel(data.cardId))}</text>

  <!-- Footer rule + small print -->
  <line x1="120" y1="1600" x2="${STORY_WIDTH - 120}" y2="1600" stroke="${PALETTE.rule}" stroke-width="1"/>
  <text x="${STORY_CX}" y="1660" font-family="${MONO}" font-size="18" fill="${PALETTE.mutedLight}" text-anchor="middle">${escapeXml(COPY.footer(data.cardId))}</text>

</svg>`;
}

export function homeSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <style>
      .title { font-family: Georgia, serif; font-size: 100px; font-weight: 700; fill: #fbbf24; text-anchor: middle; }
      .subtitle { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 36px; font-weight: 600; fill: #c7d2e0; text-anchor: middle; }
      .grid-cell { fill: #f6f0df; stroke: #221f1a; stroke-width: 2; }
      .grid-dab { fill: #b02e22; opacity: 0.7; }
    </style>
  </defs>

  <!-- Background: felt green -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0b3d2e"/>

  <!-- Felt texture gradient -->
  <defs>
    <radialGradient id="feltGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#feltGrad)"/>

  <!-- Title -->
  <text x="${WIDTH / 2}" y="100" class="title">El Bingo del Cargador</text>

  <!-- Subtitle -->
  <text x="${WIDTH / 2}" y="160" class="subtitle">Desgracias de la carga pública, verificables</text>

  <!-- Mini bingo grid (3x3) -->
  <g transform="translate(${WIDTH / 2 - 120}, 220)">
    ${Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = col * 80;
      const y = row * 80;
      const marked = i % 3 === 1;
      return `<rect x="${x}" y="${y}" width="70" height="70" class="grid-cell" rx="2"/>
${marked ? `<circle cx="${x + 35}" cy="${y + 35}" r="20" class="grid-dab"/>` : ''}`;
    }).join('\n')}
  </g>

  <!-- CTA -->
  <text x="${WIDTH / 2}" y="580" class="subtitle">Juega en bingo.gruxon.com</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
