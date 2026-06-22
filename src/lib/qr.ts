import { encode as encodeQr } from 'uqr';

export function renderQrInto(el: HTMLElement, url: string): void {
  const qr = encodeQr(url, { ecc: 'M', border: 2 });
  const scale = 5;
  const size = qr.size * scale;
  let cells = '';
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.data[row]![col]) {
        cells += `<rect x="${col * scale}" y="${row * scale}" width="${scale}" height="${scale}" fill="currentColor"/>`;
      }
    }
  }
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="text-paper-50" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`;
}
