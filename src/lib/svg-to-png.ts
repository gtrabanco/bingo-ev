import { Resvg, initWasm } from '@resvg/resvg-wasm';
// Bundled at build time by Vite's ?module WASM handler; no runtime fetch needed.
// @ts-ignore — TypeScript does not know about the ?module query suffix.
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm?module';

let ready: Promise<void> | undefined;

function ensureWasm(): Promise<void> {
  if (!ready) ready = initWasm(resvgWasm as WebAssembly.Module);
  return ready;
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return resvg.render().asPng();
}
