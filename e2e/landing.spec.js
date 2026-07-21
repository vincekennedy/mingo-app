import { test, expect } from '@playwright/test'

test.describe('Landing smoke', () => {
  test('logged-out home is auth + join only', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Mingo/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /^Login$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible()
    await expect(page.getByText(/or continue as guest/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Join Game$/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Enter 5-digit code/i)).toBeVisible()

    // Create lives on the dashboard, not landing
    await expect(page.getByRole('button', { name: /Create New Game/i })).toHaveCount(0)
  })
})
