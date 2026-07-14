import { GoogleGenerativeAI } from '@google/generative-ai'

// Prefer current Gemini Flash for new AI Studio keys.
// gemini-2.0-flash often has free quota 0; gemini-2.5-flash returns 404 for many new users.
const DEFAULT_MODEL = process.env.GEMINI_BINGO_MODEL || 'gemini-3.5-flash'
const MAX_COUNT = 48
const MIN_COUNT = 1

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

/**
 * Generate bingo square item strings from a game title using Google Gemini.
 * @param {{ title: string, count: number, apiKey?: string }} params
 * @returns {Promise<string[]>}
 */
export async function generateBingoItems({ title, count, apiKey }) {
  const key =
    apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY

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

  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: {
      temperature: 0.8,
      responseMimeType: 'application/json',
    },
    systemInstruction:
      'You generate short, distinct bingo square prompts for a custom bingo game. ' +
      'Return JSON only: {"items":["..."]}. Each item must be a concise phrase (ideally under 6 words), ' +
      'family-friendly, specific to the theme, and unique. Do not number items. Do not include "FREE".',
  })

  let result
  try {
    result = await model.generateContent(
      `Game title/theme: "${trimmedTitle}"\nGenerate exactly ${n} bingo items.`
    )
  } catch (error) {
    const err = new Error(
      error?.message || 'Google AI request failed. Check your API key and quota.'
    )
    err.status = 502
    throw err
  }

  const content = result?.response?.text?.()
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
