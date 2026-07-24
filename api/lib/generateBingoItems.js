import { GoogleGenAI } from '@google/genai'

// Prefer a current Flash model. Override with GEMINI_BINGO_MODEL if needed.
// gemini-flash-latest tracks Google's current Flash GA and avoids stale model IDs.
const DEFAULT_MODEL = process.env.GEMINI_BINGO_MODEL || 'gemini-flash-latest'
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash']
const MAX_COUNT = 48
const MIN_COUNT = 1
const MAX_INSTRUCTIONS_LENGTH = 200

/** @type {const} */
const TONE_IDS = ['family', 'funny', 'wholesome', 'office', 'adult']
const DEFAULT_TONE = 'family'

/** @type {Record<(typeof TONE_IDS)[number], string>} */
const TONE_LABELS = {
  family: 'Family-friendly',
  funny: 'Funny',
  wholesome: 'Wholesome',
  office: 'Office-safe',
  adult: 'Adult',
}

/** @type {Record<(typeof TONE_IDS)[number], string>} */
const TONE_CLAUSES = {
  family:
    'Keep every item family-friendly and kid-safe: no innuendo, swearing, or adult humor.',
  funny:
    'Make items witty, playful, and lightly roasting when it fits the theme. Keep language clean (no swearing or adult innuendo).',
  wholesome:
    'Make items warm, supportive, and sentimental rather than joke-first. Keep language clean and kind.',
  office:
    'Make items professional and workplace-appropriate. Avoid slang, roasting, politics, and anything that would be awkward in a corporate setting.',
  adult:
    'Spicy humor and innuendo are allowed when they fit the theme. Keep items as short bingo phrases — suggestive is fine; do not write graphic sexual content.',
}

const SYSTEM_PROMPT_BASE =
  'You generate short, distinct bingo square prompts for a custom bingo game. ' +
  'Return JSON only: {"items":["..."]}. Each item must be a concise phrase (ideally under 6 words), ' +
  'specific to the theme, and unique. Do not number items. Do not include "FREE".'

/**
 * @param {string | null | undefined} value
 * @returns {(typeof TONE_IDS)[number]}
 */
function resolveTone(value) {
  return TONE_IDS.includes(/** @type {(typeof TONE_IDS)[number]} */ (value))
    ? /** @type {(typeof TONE_IDS)[number]} */ (value)
    : DEFAULT_TONE
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
function sanitizeInstructions(value) {
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

/**
 * @param {(typeof TONE_IDS)[number]} tone
 * @returns {string}
 */
function buildSystemPrompt(tone) {
  return `${SYSTEM_PROMPT_BASE} ${TONE_CLAUSES[tone]}`
}

/**
 * @param {{ title: string, count: number, tone: (typeof TONE_IDS)[number], instructions: string }} params
 * @returns {string}
 */
function buildUserMessage({ title, count, tone, instructions }) {
  const lines = [
    `Game title/theme: "${title}"`,
    `Tone: ${TONE_LABELS[tone]}`,
  ]
  if (instructions) {
    lines.push(`Extra instructions: "${instructions}"`)
  }
  lines.push(`Generate exactly ${count} bingo items.`)
  return lines.join('\n')
}

function normalizeKey(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^["']|["']$/g, '')
}

function extractJsonObject(text) {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Could not parse model response as JSON.')
  }
}

function isModelUnavailableError(raw) {
  return /no longer available to new users|NOT_FOUND|is not found|not found for API version/i.test(
    raw || ''
  )
}

/**
 * Generate bingo square item strings from a game title using Google Gemini.
 * @param {{ title: string, count: number, tone?: string, instructions?: string, apiKey?: string }} params
 * @returns {Promise<string[]>}
 */
export async function generateBingoItems({
  title,
  count,
  tone,
  instructions,
  apiKey,
}) {
  const key = normalizeKey(
    apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
  )
  const primaryModel = process.env.GEMINI_BINGO_MODEL || DEFAULT_MODEL
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ]

  if (!key) {
    const err = new Error(
      'Google AI is not configured. Set GEMINI_API_KEY on the server.'
    )
    err.status = 500
    throw err
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  if (!trimmedTitle) {
    const err = new Error('Enter a game title before generating items.')
    err.status = 400
    throw err
  }

  const n = Number(count)
  if (!Number.isInteger(n) || n < MIN_COUNT || n > MAX_COUNT) {
    const err = new Error(
      `Count must be an integer between ${MIN_COUNT} and ${MAX_COUNT}.`
    )
    err.status = 400
    throw err
  }

  const resolvedTone = resolveTone(tone)
  const sanitizedInstructions = sanitizeInstructions(instructions)
  const systemInstruction = buildSystemPrompt(resolvedTone)
  const userContents = buildUserMessage({
    title: trimmedTitle,
    count: n,
    tone: resolvedTone,
    instructions: sanitizedInstructions,
  })

  const ai = new GoogleGenAI({ apiKey: key })

  let content
  let lastError = null
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userContents,
        config: {
          temperature: 0.8,
          responseMimeType: 'application/json',
          systemInstruction,
        },
      })
      content = response?.text
      lastError = null
      break
    } catch (error) {
      const raw = error?.message || String(error)
      lastError = error
      if (isModelUnavailableError(raw) && modelName !== modelsToTry[modelsToTry.length - 1]) {
        console.warn(`Gemini model ${modelName} unavailable; trying next fallback.`)
        continue
      }

      let message = raw || 'Google AI request failed. Check your API key and quota.'
      if (/ACCESS_TOKEN_TYPE_UNSUPPORTED|invalid authentication|UNAUTHENTICATED/i.test(raw)) {
        // AI Studio now often issues "AQ." auth keys; those frequently fail on
        // generativelanguage.googleapis.com. Classic "AIza..." keys from Cloud Console work.
        message = key.startsWith('AQ.')
          ? 'This GEMINI_API_KEY is an AI Studio "AQ." auth key, which Google often rejects for the Generative Language API. Create a classic API key (starts with AIza) in Google Cloud Console → APIs & Services → Credentials, restrict it to Generative Language API, set GEMINI_API_KEY, and redeploy.'
          : 'Google AI rejected this API key. Create a Generative Language API key (AIza…) in Google Cloud Console → APIs & Services → Credentials (or https://aistudio.google.com/apikey if it still issues AIza keys), set GEMINI_API_KEY, and redeploy.'
      } else if (isModelUnavailableError(raw)) {
        message =
          'That Gemini model is not available for this API key. Set GEMINI_BINGO_MODEL to a current model (e.g. gemini-flash-latest) and redeploy.'
      }
      const err = new Error(message)
      err.status = 502
      throw err
    }
  }

  if (lastError && !content) {
    const err = new Error(lastError.message || 'Google AI request failed.')
    err.status = 502
    throw err
  }

  if (!content) {
    const err = new Error('No response from Google AI.')
    err.status = 502
    throw err
  }

  let parsed
  try {
    parsed = extractJsonObject(content)
  } catch {
    const err = new Error('Could not parse Google AI response as JSON.')
    err.status = 502
    throw err
  }

  const rawItems = Array.isArray(parsed.items) ? parsed.items : []
  const items = [
    ...new Set(
      rawItems
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    ),
  ]

  if (items.length < n) {
    const err = new Error(
      `Google AI returned ${items.length} usable items; needed ${n}. Try again or edit the title.`
    )
    err.status = 502
    throw err
  }

  return items.slice(0, n)
}
