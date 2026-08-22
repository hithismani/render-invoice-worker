/**
 * Workers have no DOM Image(). Satori can only paint data: URLs reliably.
 * Fetch http(s) logo/signature before render and inline as base64 data URLs.
 */
import type { InvoiceLike } from './types.js';

const MAX_IMAGE_BYTES = 2_000_000;
const FETCH_MS = 12_000;

function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Convert a remote (or data:) image URL to a data URL. Returns undefined on failure. */
export async function urlToDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(trimmed, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'RenderInvoice-Worker/1.0 (+https://renderinvoice.com)',
      },
    });
    if (!res.ok) return undefined;
    const ctRaw = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    // Google Drive sometimes omits type; sniff from magic bytes below.
    const buf = await res.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_IMAGE_BYTES) return undefined;
    const bytes = new Uint8Array(buf);
    const mime = sniffMime(bytes, ctRaw);
    if (!mime) return undefined;
    return `data:${mime};base64,${bytesToBase64(buf)}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function sniffMime(bytes: Uint8Array, declared: string): string | undefined {
  if (declared.startsWith('image/') && !declared.includes('svg')) {
    // trust declared raster types
    if (declared === 'image/png' || declared === 'image/jpeg' || declared === 'image/jpg' || declared === 'image/webp' || declared === 'image/gif') {
      return declared === 'image/jpg' ? 'image/jpeg' : declared;
    }
  }
  // PNG
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  // JPEG
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  // GIF
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  // WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  // SVG (text)
  const head = new TextDecoder().decode(bytes.subarray(0, Math.min(256, bytes.length))).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
  if (declared.startsWith('image/')) return declared;
  return undefined;
}

/** Inline remote logo + signature so Satori/PDF never see bare http(s) img src. */
export async function hydrateInvoiceImages(invoice: InvoiceLike): Promise<InvoiceLike> {
  const [logoUrl, digitalSignatureUrl] = await Promise.all([
    urlToDataUrl(invoice.logoUrl),
    urlToDataUrl(invoice.digitalSignatureUrl),
  ]);
  return {
    ...invoice,
    // Drop failed remote URLs rather than leaving http src (invisible in PDF).
    logoUrl: logoUrl,
    digitalSignatureUrl: digitalSignatureUrl,
  };
}
