/**
 * Client helper for AI bingo item generation.
 * Calls /api/generate-items (Vercel serverless in prod; Vite middleware in local dev).
 */
export async function generateItemsFromTitle(
  title: string,
  count: number,
  options: { tone?: string; instructions?: string } = {},
): Promise<string[]> {
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

  let data: { error?: string; items?: string[] } | null = null
  try {
    data = (await response.json()) as { error?: string; items?: string[] }
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
