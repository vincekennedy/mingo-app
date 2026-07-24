import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

test.describe('Join link deep links', () => {
  test('logged-out /join/:code opens chooser with guest + login options', async ({ page }) => {
    await page.goto('/join/ABC12')
    await expect(page.getByRole('heading', { name: /Mingo/i })).toBeVisible({ timeout: 60_000 })

    const modal = page.getByRole('dialog', { name: /Join game/i })
    await expect(modal).toBeVisible({ timeout: 30_000 })
    await expect(modal.getByTestId('join-modal-code')).toHaveText('ABC12')
    await expect(modal.getByRole('button', { name: /Join as guest/i })).toBeVisible()
    await expect(modal.getByRole('button', { name: /^Log in$/i })).toBeVisible()
    await expect(modal.getByRole('button', { name: /Create account/i })).toBeVisible()

    await modal.getByRole('button', { name: /^Log in$/i }).click()
    await expect(page.getByRole('heading', { name: /^Login$/i })).toBeVisible()
    await expect(page.getByText(/join game/i)).toBeVisible()
    await expect(page.getByText('ABC12')).toBeVisible()
  })

  test('query param ?join= also opens the join chooser', async ({ page }) => {
    await page.goto('/?join=XY9K2')
    const modal = page.getByRole('dialog', { name: /Join game/i })
    await expect(modal).toBeVisible({ timeout: 60_000 })
    await expect(modal.getByTestId('join-modal-code')).toHaveText('XY9K2')
  })
})

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Join link end-to-end', () => {
  test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

  test('host share UI shows join link + QR; guest joins via /join/:code', async ({ browser }) => {
    let gameCode = null
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
      await hostPage.getByPlaceholder(/Enter a title/i).fill('Join Link Bingo')
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
      const itemInputs = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs.nth(i).fill(`Link item ${i + 1}`)
      }
      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })

      gameCode = (await hostPage.getByTestId('game-code').innerText()).trim()
      expect(gameCode).toMatch(/^[A-Z0-9]{5}$/)

      const joinUrl = await hostPage.getByTestId('join-link-url').innerText()
      expect(joinUrl).toContain(`/join/${gameCode}`)
      await expect(hostPage.getByTestId('join-qr-code')).toBeVisible({ timeout: 15_000 })
      await expect(hostPage.getByTestId('copy-join-link')).toBeVisible()

      const guestName = `LinkGuest${Date.now().toString(36).slice(-4)}`
      guestContext = await browser.newContext()
      const guestPage = await guestContext.newPage()
      await guestPage.goto(`/join/${gameCode}`)

      const modal = guestPage.getByRole('dialog', { name: /Join game/i })
      await expect(modal).toBeVisible({ timeout: 60_000 })
      await expect(modal.getByTestId('join-modal-code')).toHaveText(gameCode)
      await modal.getByLabel(/Display name/i).fill(guestName)
      await modal.getByRole('button', { name: /Join as guest/i }).click()

      const board = guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')
      await expect(board).toBeVisible({ timeout: 60_000 })
      await expect(hostPage.getByText(guestName, { exact: true })).toBeVisible({ timeout: 30_000 })
    } finally {
      if (guestContext) await guestContext.close()
      await hostContext.close()
      await deleteSmokeGame(gameCode)
    }
  })
})
