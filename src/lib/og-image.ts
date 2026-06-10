// Open Graph image generation (SVG for lightness and Workers compatibility).

const WIDTH = 1200;
const HEIGHT = 630;

interface DiplomaSvgData {
  nick: string;
  date: string;
  cardId: string;
}

export function diplomaSvg(data: DiplomaSvgData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&display=swap');
      .title { font-family: Georgia, serif; font-size: 120px; font-weight: 700; fill: #b02e22; text-anchor: middle; }
      .name { font-family: Georgia, serif; font-size: 48px; font-weight: 700; fill: #221f1a; text-anchor: middle; }
      .label { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 24px; font-weight: 600; fill: #7c7464; text-anchor: middle; }
      .verify { font-family: 'Courier New', monospace; font-size: 20px; fill: #11503c; text-anchor: middle; }
    </style>
  </defs>

  <!-- Background: aged paper -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f6f0df"/>

  <!-- Border -->
  <rect x="20" y="20" width="${WIDTH - 40}" height="${HEIGHT - 40}" fill="none" stroke="#11503c" stroke-width="3"/>

  <!-- ¡BINGO! -->
  <text x="${WIDTH / 2}" y="180" class="title">¡BINGO!</text>

  <!-- "Se certifica que" -->
  <text x="${WIDTH / 2}" y="250" class="label">Se certifica que</text>

  <!-- Nick -->
  <text x="${WIDTH / 2}" y="320" class="name">${escapeXml(data.nick)}</text>

  <!-- "ha completado..." -->
  <text x="${WIDTH / 2}" y="380" class="label">ha completado su cartón dentro del plazo</text>

  <!-- Date -->
  <text x="${WIDTH / 2}" y="440" class="label">${escapeXml(data.date)}</text>

  <!-- Verification URL -->
  <text x="${WIDTH / 2}" y="540" class="verify">bingo.gruxon.com/v/${data.cardId}</text>
</svg>`;
}

export function homeSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Georgia:wght@400;700&display=swap');
      .title { font-family: Georgia, serif; font-size: 100px; font-weight: 700; fill: #fbbf24; text-anchor: middle; text-shadow: 0 3px 6px rgba(0,0,0,0.4); }
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
      const marked = i % 3 === 1; // Marcar algunas casillas
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
