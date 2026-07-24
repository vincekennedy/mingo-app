/** Named theme ids. Values are applied via `data-theme` on the app shell. */
export const THEME_IDS = /** @type {const} */ (['party', 'sunset', 'ocean', 'ink'])

export const DEFAULT_THEME = 'party'

export const THEME_STORAGE_KEY = 'mingo.theme'

/** @type {Record<(typeof THEME_IDS)[number], string>} */
export const THEME_LABELS = {
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

/**
 * @param {string | null | undefined} value
 * @returns {(typeof THEME_IDS)[number]}
 */
export function resolveTheme(value) {
  return THEME_IDS.includes(/** @type {(typeof THEME_IDS)[number]} */ (value))
    ? /** @type {(typeof THEME_IDS)[number]} */ (value)
    : DEFAULT_THEME
}

/**
 * @returns {(typeof THEME_IDS)[number]}
 */
export function getStoredTheme() {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

/**
 * @param {string | null | undefined} value
 * @returns {(typeof THEME_IDS)[number]}
 */
export function setStoredTheme(value) {
  const theme = resolveTheme(value)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore quota / private-mode failures; in-memory state still updates.
  }
  return theme
}

/**
 * @param {string} screen
 * @param {string | null | undefined} gameTheme
 * @param {string | null | undefined} userTheme
 * @returns {(typeof THEME_IDS)[number]}
 */
export function activeShellTheme(screen, gameTheme, userTheme) {
  if (GAME_THEME_SCREENS.has(screen)) {
    return resolveTheme(gameTheme)
  }
  return resolveTheme(userTheme)
}
