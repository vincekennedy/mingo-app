/** Generation tone ids for AI bingo item generation. */
export const GENERATION_TONE_IDS = [
  'family',
  'funny',
  'wholesome',
  'office',
  'adult',
] as const

export type GenerationToneId = (typeof GENERATION_TONE_IDS)[number]

export const DEFAULT_GENERATION_TONE: GenerationToneId = 'family'

export const MAX_INSTRUCTIONS_LENGTH = 200

export const GENERATION_TONE_LABELS: Record<GenerationToneId, string> = {
  family: 'Family-friendly',
  funny: 'Funny',
  wholesome: 'Wholesome',
  office: 'Office-safe',
  adult: 'Adult',
}

function isGenerationToneId(
  value: string | null | undefined,
): value is GenerationToneId {
  return GENERATION_TONE_IDS.includes(value as GenerationToneId)
}

export function resolveGenerationTone(
  value: string | null | undefined,
): GenerationToneId {
  return isGenerationToneId(value) ? value : DEFAULT_GENERATION_TONE
}

/** Trim, strip control chars, hard-cap length. */
export function sanitizeGenerationInstructions(
  value: string | null | undefined,
): string {
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
