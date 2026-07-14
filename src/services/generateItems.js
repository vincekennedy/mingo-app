/**
 * Client helper for AI bingo item generation.
 * Calls /api/generate-items (Vercel serverless in prod; Vite middleware in local dev).
 */
export async function generateItemsFromTitle(title, count) {
  const response = await fetch('/api/generate-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, count }),
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
