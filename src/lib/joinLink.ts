/** sessionStorage key for join-after-login/register */
export const PENDING_JOIN_KEY = 'mingo_pending_join'

/** Random codes stay 5 chars from the ambiguous-safe alphabet. */
export const RANDOM_GAME_CODE_LENGTH = 5

/** Custom vanity codes: 4–12 alphanumeric (A–Z / 0–9). */
export const CUSTOM_CODE_MIN_LENGTH = 4
export const CUSTOM_CODE_MAX_LENGTH = 12

/** @deprecated use RANDOM_GAME_CODE_LENGTH — kept for older imports */
export const GAME_CODE_LENGTH = RANDOM_GAME_CODE_LENGTH

/** Alphabet used when generating random codes (no I/O/0/1). */
export const RANDOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeGameCode(raw: unknown): string {
  return String(raw || '')
    .toUpperCase()
    .trim()
}

/** Valid join / vanity code: 4–12 chars A–Z0–9. */
export function isValidGameCode(code: string): boolean {
  const normalized = normalizeGameCode(code)
  return (
    normalized.length >= CUSTOM_CODE_MIN_LENGTH &&
    normalized.length <= CUSTOM_CODE_MAX_LENGTH &&
    /^[A-Z0-9]+$/.test(normalized)
  )
}

/**
 * Optional custom entry field: empty is OK (random will be used); otherwise must be valid.
 */
export function isValidCustomEntryCodeOrEmpty(raw: string): boolean {
  const normalized = normalizeGameCode(raw)
  if (!normalized) return true
  return isValidGameCode(normalized)
}

export function generateRandomGameCode(): string {
  let code = ''
  for (let i = 0; i < RANDOM_GAME_CODE_LENGTH; i++) {
    code += RANDOM_CODE_ALPHABET.charAt(
      Math.floor(Math.random() * RANDOM_CODE_ALPHABET.length),
    )
  }
  return code
}

type JoinLocationLike = {
  pathname?: string
  search?: string
}

/** Read a join code from `/join/ABC12` or `?join=` / `?code=`. */
export function parseJoinCodeFromLocation(
  loc: JoinLocationLike | null = typeof window !== 'undefined'
    ? window.location
    : null,
): string | null {
  if (!loc) return null

  try {
    const pathMatch = String(loc.pathname || '').match(
      /^\/join\/([A-Za-z0-9]{4,12})\/?$/i,
    )
    if (pathMatch?.[1] && isValidGameCode(pathMatch[1])) {
      return normalizeGameCode(pathMatch[1])
    }

    const params = new URLSearchParams(loc.search || '')
    const fromQuery = params.get('join') || params.get('code')
    if (fromQuery && isValidGameCode(fromQuery)) {
      return normalizeGameCode(fromQuery)
    }
  } catch {
    /* ignore malformed location */
  }

  return null
}

export function buildJoinPath(code: string): string {
  return `/join/${normalizeGameCode(code)}`
}

export function buildJoinUrl(
  code: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
): string {
  return `${origin}${buildJoinPath(code)}`
}

export function readPendingJoinCode(): string | null {
  try {
    const value = sessionStorage.getItem(PENDING_JOIN_KEY)
    return value && isValidGameCode(value) ? normalizeGameCode(value) : null
  } catch {
    return null
  }
}

export function writePendingJoinCode(code: string | null | undefined): void {
  try {
    if (code && isValidGameCode(code)) {
      sessionStorage.setItem(PENDING_JOIN_KEY, normalizeGameCode(code))
    } else {
      sessionStorage.removeItem(PENDING_JOIN_KEY)
    }
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearPendingJoinCode(): void {
  writePendingJoinCode(null)
}

export function resolveInitialJoinCode(): string {
  if (typeof window === 'undefined') return ''
  return parseJoinCodeFromLocation(window.location) || readPendingJoinCode() || ''
}

export function clearJoinPathFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const { pathname, search, hash } = window.location
    const onJoinPath = /^\/join\/[A-Za-z0-9]{4,12}\/?$/i.test(pathname)
    const params = new URLSearchParams(search)
    const hadJoinQuery = params.has('join') || params.has('code')
    if (!onJoinPath && !hadJoinQuery) return

    params.delete('join')
    params.delete('code')
    const nextSearch = params.toString()
    const nextUrl = `${onJoinPath ? '/' : pathname}${nextSearch ? `?${nextSearch}` : ''}${hash || ''}`
    window.history.replaceState(null, '', nextUrl || '/')
  } catch {
    /* ignore */
  }
}
