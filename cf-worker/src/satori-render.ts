/**
 * Satori render pipeline for Cloudflare Workers.
 *
 *   invoice JSON
 *     -> satori (embedFont:false)  -> SVG with real <text> + path geometry
 *     -> satoriSvgToPdf            -> vector PDF (selectable text, borders, radius)
 *
 *   format=png still uses resvg for images only — never embedded into PDF.
 */

import satori, { init as initSatoriWasm } from 'satori/standalone';
import { Resvg, initWasm as initResvgWasm } from '@resvg/resvg-wasm';
import RESVG_WASM_MODULE from '../wasm/resvg.wasm';
import SATORI_WASM_MODULE from '../wasm/yoga.wasm';
import { invoiceElement } from './SatoriInvoiceTemplate.js';
import type { InvoiceLike } from './types.js';
import { compressToEncodedURIComponent } from './lz.js';
import { loadInvoiceFont } from './invoiceFonts.js';
import { satoriSvgToPdf } from './satoriSvgToPdf.js';

let resvgReady = false;
let satoriReady = false;

const isAlreadyInitialized = (e: unknown) => /already initialized/i.test(e instanceof Error ? e.message : String(e));

async function ensureResvg(): Promise<void> {
  if (resvgReady) return;
  try { await initResvgWasm(RESVG_WASM_MODULE); }
  catch (e) { if (!isAlreadyInitialized(e)) throw e; }
  resvgReady = true;
}

async function ensureSatori(): Promise<void> {
  if (satoriReady) return;
  try { await initSatoriWasm(SATORI_WASM_MODULE); }
  catch (e) { if (!isAlreadyInitialized(e)) throw e; }
  satoriReady = true;
}

export async function renderSvg(invoice: InvoiceLike, width = 900, embedFont = true): Promise<string> {
  await ensureSatori();
  const { family, regular, bold, fallbackRegular, fallbackBold } = await loadInvoiceFont(invoice.font);
  const tree = invoiceElement(invoice, { forExport: true });
  const fonts = [
    { name: family, data: regular, weight: 400 as const, style: 'normal' as const },
    { name: family, data: bold, weight: 700 as const, style: 'normal' as const },
  ];
  if (family !== 'Inter') {
    fonts.push(
      { name: 'Inter', data: fallbackRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fallbackBold, weight: 700, style: 'normal' },
    );
  }
  return satori(tree, {
    width,
    embedFont,
    fonts,
  });
}

export async function renderPng(invoice: InvoiceLike, width = 900): Promise<Uint8Array> {
  const svg = await renderSvg(invoice, width, true);
  await ensureResvg();
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width * 2 } });
  return resvg.render().asPng();
}

/** Vector PDF: selectable text, path borders/radius. Never a full-page PNG. */
export async function renderPdf(invoice: InvoiceLike, width = 900): Promise<Uint8Array> {
  const fitToA4 = invoice.autoSize === false;
  const svg = await renderSvg(invoice, width, false);
  const { family, regular, bold, fallbackRegular, fallbackBold } = await loadInvoiceFont(invoice.font);
  const editUrl =
    invoice.includeEditLink === false
      ? undefined
      : `https://renderinvoice.com/playground#i=${compressToEncodedURIComponent(JSON.stringify(invoice))}`;
  return satoriSvgToPdf(
    svg,
    {
      regular,
      bold,
      fallbackRegular: family === 'Inter' ? undefined : fallbackRegular,
      fallbackBold: family === 'Inter' ? undefined : fallbackBold,
    },
    { fitToA4, editUrl },
  );
}
