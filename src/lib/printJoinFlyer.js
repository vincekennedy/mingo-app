import QRCode from 'qrcode';
import { buildJoinUrl, isValidGameCode, normalizeGameCode } from './joinLink';

/**
 * Printable flyer route: /print/join/ABC12?title=Music%20Bingo
 * Opens as its own page (new tab) so hosts can print handouts.
 */
export function buildPrintJoinPath(code, title = '') {
  const path = `/print/join/${normalizeGameCode(code)}`;
  const trimmed = String(title || '').trim();
  if (!trimmed) return path;
  return `${path}?title=${encodeURIComponent(trimmed)}`;
}

export function buildPrintJoinUrl(code, title = '', origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin}${buildPrintJoinPath(code, title)}`;
}

export function parsePrintJoinFromLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return null;
  try {
    const pathMatch = String(loc.pathname || '').match(/^\/print\/join\/([A-Za-z0-9]{5})\/?$/i);
    if (!pathMatch || !isValidGameCode(pathMatch[1])) return null;
    const params = new URLSearchParams(loc.search || '');
    const title = (params.get('title') || '').trim();
    return {
      code: normalizeGameCode(pathMatch[1]),
      title,
      joinUrl: buildJoinUrl(pathMatch[1], loc.origin || window.location.origin),
    };
  } catch {
    return null;
  }
}

export function resolveInitialPrintJoin() {
  if (typeof window === 'undefined') return null;
  return parsePrintJoinFromLocation(window.location);
}

/** Generate a QR data URL for flyer rendering. */
export async function generateJoinQrDataUrl(joinUrl, size = 512) {
  return QRCode.toDataURL(joinUrl, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#111827', light: '#ffffff' },
  });
}

/** Open the printable flyer in a new browser tab (preferred over inline QR). */
export function openPrintableJoinFlyer(code, title = '') {
  if (typeof window === 'undefined' || !isValidGameCode(code)) return null;
  const url = buildPrintJoinUrl(code, title);
  return window.open(url, '_blank', 'noopener,noreferrer');
}
