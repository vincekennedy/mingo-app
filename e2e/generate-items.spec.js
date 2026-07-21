import { test, expect } from '@playwright/test'

/**
 * Verifies /api routes are real serverless handlers (JSON), not SPA HTML / 405.
 * Does not require GEMINI_API_KEY — missing key should still return JSON error.
 */
test.describe('API route smoke', () => {
  test('/api/health returns JSON', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status(), await res.text()).toBe(200)
    expect(res.headers()['content-type'] || '').toMatch(/application\/json/i)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.service).toBe('mingo-api')
  })

  test('/api/generate-items responds with JSON (not SPA HTML)', async ({ request }) => {
    const res = await request.post('/api/generate-items', {
      data: { title: 'Smoke test bingo theme', count: 8 },
    })

    const contentType = res.headers()['content-type'] || ''
    const text = await res.text()

    expect(res.status(), text).not.toBe(405)
    expect(contentType, text.slice(0, 200)).toMatch(/application\/json/i)
    expect(text.trim().startsWith('<!doctype'), 'SPA HTML served instead of API').toBe(false)

    const body = JSON.parse(text)
    // Playwright APIResponse.ok is a method (res.ok is always truthy as a function)
    if (res.ok()) {
      expect(Array.isArray(body.items)).toBe(true)
      expect(body.items.length).toBeGreaterThanOrEqual(8)
    } else {
      expect(typeof body.error, `status ${res.status()}: ${text.slice(0, 300)}`).toBe(
        'string'
      )
      expect(body.error.length).toBeGreaterThan(0)
    }
  })
})
