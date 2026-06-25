import { Resvg, initWasm } from '@resvg/resvg-wasm';
// Bundled at build time by Vite's ?module WASM handler; no runtime fetch needed.
// @ts-ignore — TypeScript does not know about the ?module query suffix.
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?module';
import { LORA_WOFF2, LORA_ITALIC_WOFF2 } from './og-fonts';

// Lora is already available as a base64 data-URI subset — decode without a fetch.
// BricolageGrotesque (system-ui / SANS in og-image.ts) must be fetched once from
// the origin; it is not embedded because it is much larger than the Lora subset.
function dataUriToUint8Array(dataUri: string): Uint8Array {
  const b64 = dataUri.split(',')[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

let ready: Promise<void> | undefined;
let fontBuffers: Uint8Array[] | undefined;

function ensureReady(origin: string): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const [sansBuffer] = await Promise.all([
        fetch(`${origin}/fonts/BricolageGrotesque-variable.woff2`)
          .then(r => r.arrayBuffer())
          .then(buf => new Uint8Array(buf)),
        initWasm(resvgWasm as WebAssembly.Module),
      ]);
      fontBuffers = [
        dataUriToUint8Array(LORA_WOFF2),
        dataUriToUint8Array(LORA_ITALIC_WOFF2),
        sansBuffer,
      ];
    })();
  }
  return ready;
}

export async function svgToPng(svg: string, width: number, origin: string): Promise<Uint8Array> {
  await ensureReady(origin);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontBuffers: fontBuffers!,
      loadSystemFonts: false,
      defaultFontFamily: 'Bricolage Grotesque',
      serifFamily: 'Lora',
      sansSerifFamily: 'Bricolage Grotesque',
      monospaceFamily: 'Space Mono',
    },
  });
  return resvg.render().asPng();
}
