import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Custom entry codes', () => {
  test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

  test('vanity code reusable after end', async ({ browser }) => {
    const vanity = `MON${Date.now().toString(36).slice(-5)}`.toUpperCase().slice(0, 12)
    const hostContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    let guestContext = null

    try {
      await hostPage.goto('/')
      await expect(hostPage.getByRole('button', { name: /^Login$/i })).toBeVisible({ timeout: 60_000 })
      await hostPage.getByRole('button', { name: /^Login$/i }).click()
      await hostPage.locator('input[name="email"]').fill(hostEmail)
      await hostPage.locator('input[name="password"]').fill(hostPassword)
      await hostPage.locator('form').getByRole('button', { name: /^Login$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 45_000 })

      await hostPage.getByRole('button', { name: /Create New Game/i }).click()
      await hostPage.getByPlaceholder(/Enter a title/i).fill('Custom Code Smoke A')
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
      await hostPage.getByTestId('setup-entry-code').fill(vanity)
      const itemInputs = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs.nth(i).fill(`Code item ${i + 1}`)
      }
      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })
      expect((await hostPage.getByTestId('game-code').innerText()).trim()).toBe(vanity)

      guestContext = await browser.newContext()
      const guestPage = await guestContext.newPage()
      await guestPage.goto('/')
      await expect(guestPage.getByRole('button', { name: /^Join Game$/i })).toBeVisible({
        timeout: 60_000,
      })
      await guestPage.getByPlaceholder(/Enter join code/i).fill(vanity)
      await guestPage.getByRole('button', { name: /^Join Game$/i }).click()
      const guestModal = guestPage.getByRole('dialog', { name: /Join game/i })
      await expect(guestModal).toBeVisible()
      await guestModal.getByLabel(/Display name/i).fill(`CodeGuest${Date.now().toString(36).slice(-4)}`)
      await guestModal.getByRole('button', { name: /Join as guest/i }).click()
      await expect(guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')).toBeVisible({
        timeout: 60_000,
      })

      // End via dashboard
      await hostPage.getByRole('button', { name: /Back to Dashboard/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 30_000 })
      hostPage.once('dialog', (d) => d.accept())
      await hostPage.getByRole('button', { name: /End Game/i }).first().click()
      await expect(hostPage.getByText(vanity, { exact: true })).toHaveCount(0, { timeout: 30_000 })

      // Recreate with same vanity
      await hostPage.getByRole('button', { name: /Create New Game|Create Your First Game/i }).click()
      await hostPage.getByPlaceholder(/Enter a title/i).fill('Custom Code Smoke B')
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
      await hostPage.getByTestId('setup-entry-code').fill(vanity)
      const itemInputs2 = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs2.nth(i).fill(`Code item B${i + 1}`)
      }
      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })
      expect((await hostPage.getByTestId('game-code').innerText()).trim()).toBe(vanity)

      await guestContext.close()
      guestContext = await browser.newContext()
      const guest2 = await guestContext.newPage()
      await guest2.goto('/')
      await expect(guest2.getByRole('button', { name: /^Join Game$/i })).toBeVisible({
        timeout: 60_000,
      })
      await guest2.getByPlaceholder(/Enter join code/i).fill(vanity)
      await guest2.getByRole('button', { name: /^Join Game$/i }).click()
      const modal2 = guest2.getByRole('dialog', { name: /Join game/i })
      await expect(modal2).toBeVisible()
      await modal2.getByLabel(/Display name/i).fill(`CodeGuest2${Date.now().toString(36).slice(-4)}`)
      await modal2.getByRole('button', { name: /Join as guest/i }).click()
      await expect(guest2.locator('.bg-white.rounded-2xl.shadow-2xl .grid')).toBeVisible({
        timeout: 60_000,
      })
    } finally {
      await deleteSmokeGame(vanity).catch(() => {})
      await guestContext?.close()
      await hostContext.close()
    }
  })
})
