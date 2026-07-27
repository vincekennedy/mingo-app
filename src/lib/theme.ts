/** Named theme ids. Values are applied via `data-theme` on the app shell. */
export const THEME_IDS = ['party', 'sunset', 'ocean', 'ink'] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'party'

export const THEME_STORAGE_KEY = 'mingo.theme'

export const THEME_LABELS: Record<ThemeId, string> = {
  party: 'Party',
  sunset: 'Sunset',
  ocean: 'Ocean',
  ink: 'Ink',
}

/**
 * Screens that show the active game’s theme (draft or loaded config).
 * Auth / home / dashboard use the user preference instead.
 */
export const GAME_THEME_SCREENS = new Set(['setup', 'host', 'play'])

function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId)
}

export function resolveTheme(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME
}

export function getStoredTheme(): ThemeId {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

export function setStoredTheme(value: string | null | undefined): ThemeId {
  const theme = resolveTheme(value)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore quota / private-mode failures; in-memory state still updates.
  }
  return theme
}

export function activeShellTheme(
  screen: string,
  gameTheme: string | null | undefined,
  userTheme: string | null | undefined,
): ThemeId {
  if (GAME_THEME_SCREENS.has(screen)) {
    return resolveTheme(gameTheme)
  }
  return resolveTheme(userTheme)
}
