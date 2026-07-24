/** sessionStorage key for join-after-login/register */
export const PENDING_JOIN_KEY = 'mingo_pending_join';

/** Alphabet used when generating codes (no I/O/0/1). Length check is the join gate. */
export const GAME_CODE_LENGTH = 5;

export function normalizeGameCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .trim();
}

export function isValidGameCode(code) {
  const normalized = normalizeGameCode(code);
  return normalized.length === GAME_CODE_LENGTH && /^[A-Z0-9]+$/.test(normalized);
}

/**
 * Read a join code from `/join/ABC12` or `?join=` / `?code=`.
 * Does not require React Router — pathname is enough with the SPA rewrite.
 */
export function parseJoinCodeFromLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return null;

  try {
    const pathMatch = String(loc.pathname || '').match(/^\/join\/([A-Za-z0-9]{5})\/?$/i);
    if (pathMatch && isValidGameCode(pathMatch[1])) {
      return normalizeGameCode(pathMatch[1]);
    }

    const params = new URLSearchParams(loc.search || '');
    const fromQuery = params.get('join') || params.get('code');
    if (fromQuery && isValidGameCode(fromQuery)) {
      return normalizeGameCode(fromQuery);
    }
  } catch {
    /* ignore malformed location */
  }

  return null;
}

export function buildJoinPath(code) {
  return `/join/${normalizeGameCode(code)}`;
}

export function buildJoinUrl(code, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  return `${origin}${buildJoinPath(code)}`;
}

export function readPendingJoinCode() {
  try {
    const value = sessionStorage.getItem(PENDING_JOIN_KEY);
    return value && isValidGameCode(value) ? normalizeGameCode(value) : null;
  } catch {
    return null;
  }
}

export function writePendingJoinCode(code) {
  try {
    if (code && isValidGameCode(code)) {
      sessionStorage.setItem(PENDING_JOIN_KEY, normalizeGameCode(code));
    } else {
      sessionStorage.removeItem(PENDING_JOIN_KEY);
    }
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearPendingJoinCode() {
  writePendingJoinCode(null);
}

/** Prefer URL code, then any stored pending code (e.g. mid-login). */
export function resolveInitialJoinCode() {
  if (typeof window === 'undefined') return '';
  return parseJoinCodeFromLocation(window.location) || readPendingJoinCode() || '';
}

/** Drop `/join/...` from the address bar without a full navigation. */
export function clearJoinPathFromUrl() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const { pathname, search, hash } = window.location;
    const onJoinPath = /^\/join\/[A-Za-z0-9]{5}\/?$/i.test(pathname);
    const params = new URLSearchParams(search);
    const hadJoinQuery = params.has('join') || params.has('code');
    if (!onJoinPath && !hadJoinQuery) return;

    params.delete('join');
    params.delete('code');
    const nextSearch = params.toString();
    const nextUrl = `${onJoinPath ? '/' : pathname}${nextSearch ? `?${nextSearch}` : ''}${hash || ''}`;
    window.history.replaceState(null, '', nextUrl || '/');
  } catch {
    /* ignore */
  }
}
