/** Named theme ids. Values are applied via `data-theme` on the app shell. */
export const THEME_IDS = /** @type {const} */ (['party'])

export const DEFAULT_THEME = 'party'

/**
 * @param {string | null | undefined} value
 * @returns {(typeof THEME_IDS)[number]}
 */
export function resolveTheme(value) {
  return THEME_IDS.includes(/** @type {(typeof THEME_IDS)[number]} */ (value))
    ? /** @type {(typeof THEME_IDS)[number]} */ (value)
    : DEFAULT_THEME
}
