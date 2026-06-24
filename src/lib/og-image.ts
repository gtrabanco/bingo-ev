// Open Graph image generation (SVG for lightness and Workers compatibility).

import { encode } from 'uqr';
import type { Honorific } from './card';
import { PALETTE, SERIF, SANS, MONO, HONORIFICS, COPY, VERIFY_BASE_URL } from './certificate-design';
import { LORA_WOFF2, LORA_ITALIC_WOFF2 } from './og-fonts';
import situations from '../data/situations.json';

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
  <defs><style>
    @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: normal; src: url('${LORA_WOFF2}') format('woff2-variations'); }
    @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: italic; src: url('${LORA_ITALIC_WOFF2}') format('woff2-variations'); }
  </style></defs>

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
  <text x="${CX}" y="228" font-family="${SERIF}" font-size="124" font-weight="700" fill="${PALETTE.dauberRed}" text-anchor="middle">&#xA1;BINGO!</text>

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
  <defs><style>
    @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: normal; src: url('${LORA_WOFF2}') format('woff2-variations'); }
    @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: italic; src: url('${LORA_ITALIC_WOFF2}') format('woff2-variations'); }
  </style></defs>

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
  <text x="${STORY_CX}" y="430" font-family="${SERIF}" font-size="175" font-weight="700" fill="${PALETTE.dauberRed}" text-anchor="middle">&#xA1;BINGO!</text>

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

// ---------------------------------------------------------------------------
// Home share card — shared constants and helpers (used by homeSvg + homeStorySvg)
// ---------------------------------------------------------------------------

// 12 situations curated for maximum punch and instant recognisability.
// Selected by id so the card stays stable even if the gameplay pool is re-sorted.
const OG_IDS = [
  'app-disponible',
  'nada-funciona',
  'potencia-fantasma',
  'plaza-ocupada',
  'error-desconocido',
  'corte-al-80',
  'unico-rapido-roto',
  'reinicia-el-coche',
  'mantenimiento-eterno',
  'precio-sorpresa',
  'alta-con-fe',
  'cable-corto',
];
const _ogById = new Map(situations.map(s => [s.id, s.text]));
// Top-up guard: if a curated id is ever removed, fill from the pool head so the
// card always has exactly 12 cells and never breaks.
const OG_SITUATIONS = (() => {
  const picked = OG_IDS.map(id => _ogById.get(id)).filter(Boolean) as string[];
  for (const s of situations) {
    if (picked.length >= 12) break;
    if (!picked.includes(s.text)) picked.push(s.text);
  }
  return picked.slice(0, 12);
})();

// Grid positions (0-indexed, row-major) that show a dab mark on the home card.
// Spread across rows/columns so the card looks mid-game at a glance.
const OG_MARKED = new Set([1, 4, 7, 10]);

// Greedy word-wrap: splits text into ≤ maxLines lines of ≤ maxChars characters each.
// Overflow past maxLines is truncated with a trailing «…» on the last line.
function wrapCellText(text: string, maxChars = 24, maxLines = 3): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; }
    else { cur = next; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1]!.replace(/.{1}$/, '…');
  }
  return lines;
}

// Render one bingo card cell: paper background, optional dab, word-wrapped text.
// dabRadius scales with cell height — pass a larger value for portrait cells.
function renderCell(
  x: number, y: number, w: number, h: number,
  text: string, marked: boolean,
  fontSize = 17, maxChars = 24, lineHeight = 20, dabRadius = 26,
): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const lines = wrapCellText(text, maxChars, 3);
  const n = lines.length;
  const ty = cy - ((n - 1) * lineHeight) / 2;

  const dab = marked
    ? `<circle cx="${cx}" cy="${cy}" r="${dabRadius}" fill="#b02e22" opacity="0.7"/>`
    : '';
  const tspans = lines
    .map((ln, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(ln)}</tspan>`)
    .join('');

  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f6f0df" stroke="#221f1a" stroke-width="1.5" rx="3"/>
  ${dab}
  <text x="${cx}" y="${ty}" font-family="${SANS}" font-size="${fontSize}" fill="#221f1a" text-anchor="middle">${tspans}</text>`;
}

// ---------------------------------------------------------------------------
// Landscape 1200×630 home share image (og:image for link previews)
// ---------------------------------------------------------------------------

export function homeSvg(): string {
  // Grid: 4 columns × 3 rows, row-major.
  // Spans x 80→1120 (1040px → 260px/cell) × y 190→541 (351px → 117px/cell).
  const gridX = 80;
  const gridY = 190;
  const cellW = 260;
  const cellH = 117;

  let cellsSvg = '';
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    cellsSvg += '\n  ' + renderCell(
      gridX + col * cellW, gridY + row * cellH, cellW, cellH,
      OG_SITUATIONS[i]!, OG_MARKED.has(i),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <style>
      @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: normal; src: url('${LORA_WOFF2}') format('woff2-variations'); }
      @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: italic; src: url('${LORA_ITALIC_WOFF2}') format('woff2-variations'); }
    </style>
    <radialGradient id="feltGrad" cx="50%" cy="50%" r="60%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.08);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.25);stop-opacity:1"/>
    </radialGradient>
  </defs>

  <!-- Background: felt green + vignette gradient -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0b3d2e"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#feltGrad)"/>

  <!-- Title: centred, amber, Lora serif -->
  <text x="${CX}" y="90" font-family="${SERIF}" font-size="66" font-weight="700" fill="#fbbf24" text-anchor="middle">El Bingo del Cargador</text>

  <!-- Subtitle -->
  <text x="${CX}" y="138" font-family="${SANS}" font-size="22" fill="#c7d2e0" text-anchor="middle">Desgracias de la carga pública, verificables</text>

  <!-- 4×3 bingo card with real situation text -->
  ${cellsSvg}

  <!-- Hook + CTA — centred so they survive a square centre-crop (safe zone) -->
  <text x="${CX}" y="587" font-family="${SANS}" font-size="22" fill="#c7d2e0" text-anchor="middle">¿Cuántas llevas tú?  •  bingo.gruxon.com</text>

</svg>`;
}

// ---------------------------------------------------------------------------
// Portrait 1080×1920 home share image (uploadable Story/Reel/TikTok asset)
// ---------------------------------------------------------------------------

export function homeStorySvg(): string {
  // Grid: 3 columns × 4 rows (portrait transpose of the canonical landscape card).
  // Spans x 60→1020 (960px → 320px/cell) × y 390→1598 (1208px → 302px/cell).
  const gridX = 60;
  const gridY = 390;
  const cellW = 320;
  const cellH = 302;
  // Portrait mark positions (0-indexed, row-major, 3-col grid) — spread diagonally.
  const storyMarked = new Set([1, 3, 7, 11]);

  let cellsSvg = '';
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 3); // 3 columns in portrait
    const col = i % 3;
    cellsSvg += '\n  ' + renderCell(
      gridX + col * cellW, gridY + row * cellH, cellW, cellH,
      OG_SITUATIONS[i]!, storyMarked.has(i),
      22, 20, 28, 40, // fontSize, maxChars, lineHeight, dabRadius
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STORY_WIDTH} ${STORY_HEIGHT}">
  <defs>
    <style>
      @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: normal; src: url('${LORA_WOFF2}') format('woff2-variations'); }
      @font-face { font-family: 'Lora'; font-weight: 400 700; font-style: italic; src: url('${LORA_ITALIC_WOFF2}') format('woff2-variations'); }
    </style>
    <radialGradient id="feltGradStory" cx="50%" cy="50%" r="60%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.08);stop-opacity:1"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.25);stop-opacity:1"/>
    </radialGradient>
  </defs>

  <!-- Background: felt green + vignette gradient -->
  <rect width="${STORY_WIDTH}" height="${STORY_HEIGHT}" fill="#0b3d2e"/>
  <rect width="${STORY_WIDTH}" height="${STORY_HEIGHT}" fill="url(#feltGradStory)"/>

  <!-- Title: two lines, centred, amber Lora serif -->
  <text x="${STORY_CX}" y="140" font-family="${SERIF}" font-size="90" font-weight="700" fill="#fbbf24" text-anchor="middle">El Bingo</text>
  <text x="${STORY_CX}" y="244" font-family="${SERIF}" font-size="90" font-weight="700" fill="#fbbf24" text-anchor="middle">del Cargador</text>

  <!-- Subtitle: two lines -->
  <text x="${STORY_CX}" y="304" font-family="${SANS}" font-size="32" fill="#c7d2e0" text-anchor="middle">Desgracias de la carga</text>
  <text x="${STORY_CX}" y="344" font-family="${SANS}" font-size="32" fill="#c7d2e0" text-anchor="middle">pública, verificables</text>

  <!-- 3×4 bingo card (portrait transpose) with real situation text -->
  ${cellsSvg}

  <!-- Hook line -->
  <text x="${STORY_CX}" y="1668" font-family="${SANS}" font-size="44" fill="#c7d2e0" text-anchor="middle">¿Cuántas llevas tú?</text>

  <!-- CTA URL: large amber serif for maximum visibility -->
  <text x="${STORY_CX}" y="1778" font-family="${SERIF}" font-size="60" font-weight="700" fill="#fbbf24" text-anchor="middle">bingo.gruxon.com</text>

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
