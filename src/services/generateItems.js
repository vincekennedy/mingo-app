/**
 * Client helper for AI bingo item generation.
 * Calls /api/generate-items (Vercel serverless in prod; Vite middleware in local dev).
 *
 * @param {string} title
 * @param {number} count
 * @param {{ tone?: string, instructions?: string }} [options]
 */
export async function generateItemsFromTitle(title, count, options = {}) {
  const response = await fetch('/api/generate-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      count,
      tone: options.tone,
      instructions: options.instructions,
    }),
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || `Generation failed (${response.status})`)
  }

  if (!Array.isArray(data?.items) || data.items.length === 0) {
    throw new Error('No items were returned. Try a more specific title.')
  }

  return data.items
}
