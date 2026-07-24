/** Generation tone ids for AI bingo item generation. */
export const GENERATION_TONE_IDS = /** @type {const} */ ([
  'family',
  'funny',
  'wholesome',
  'office',
  'adult',
])

export const DEFAULT_GENERATION_TONE = 'family'

export const MAX_INSTRUCTIONS_LENGTH = 200

/** @type {Record<(typeof GENERATION_TONE_IDS)[number], string>} */
export const GENERATION_TONE_LABELS = {
  family: 'Family-friendly',
  funny: 'Funny',
  wholesome: 'Wholesome',
  office: 'Office-safe',
  adult: 'Adult',
}

/**
 * @param {string | null | undefined} value
 * @returns {(typeof GENERATION_TONE_IDS)[number]}
 */
export function resolveGenerationTone(value) {
  return GENERATION_TONE_IDS.includes(
    /** @type {(typeof GENERATION_TONE_IDS)[number]} */ (value)
  )
    ? /** @type {(typeof GENERATION_TONE_IDS)[number]} */ (value)
    : DEFAULT_GENERATION_TONE
}

/**
 * Trim, strip control chars, hard-cap length.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function sanitizeGenerationInstructions(value) {
  if (typeof value !== 'string') return ''
  let cleaned = ''
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code >= 32 || code === 9 || code === 10 || code === 13) {
      cleaned += ch
    }
  }
  return cleaned.trim().slice(0, MAX_INSTRUCTIONS_LENGTH)
}
