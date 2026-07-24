import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Four corners win mode', () => {
  test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

  test('guest wins by marking four corners', async ({ browser }) => {
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
      await hostPage.getByPlaceholder(/Enter a title/i).fill('Corners Smoke')
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
      await hostPage.getByLabel(/^Win mode$/i).selectOption('four_corners')

      const itemInputs = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs.nth(i).fill(`Corner item ${i + 1}`)
      }

      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })
      await expect(hostPage.getByText(/four corners/i)).toBeVisible()

      gameCode = (await hostPage.getByTestId('game-code').innerText()).trim()
      expect(gameCode).toMatch(/^[A-Z0-9]{5}$/)

      const guestName = `CornerGuest${Date.now().toString(36).slice(-4)}`
      guestContext = await browser.newContext()
      const guestPage = await guestContext.newPage()
      await guestPage.goto('/')
      await expect(guestPage.getByRole('button', { name: /^Join Game$/i })).toBeVisible({ timeout: 60_000 })
      await guestPage.getByPlaceholder(/Enter 5-digit code/i).fill(gameCode)
      await guestPage.getByRole('button', { name: /^Join Game$/i }).click()

      const guestModal = guestPage.getByRole('dialog', { name: /Join game/i })
      await expect(guestModal).toBeVisible()
      await guestModal.getByLabel(/Display name/i).fill(guestName)
      await guestModal.getByRole('button', { name: /Join as guest/i }).click()

      const board = guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')
      await expect(board).toBeVisible({ timeout: 60_000 })
      await expect(guestPage.getByText(/four corners/i)).toBeVisible()

      const cells = board.locator('button')
      // 3×3 corners: 0, 2, 6, 8
      await cells.nth(0).click()
      await cells.nth(2).click()
      await cells.nth(6).click()
      await cells.nth(8).click()

      const confirmBtn = hostPage.getByRole('button', { name: /Confirm Win/i })
      await expect(confirmBtn).toBeVisible({ timeout: 60_000 })
      await expect(hostPage.getByText(/Win Type:\s*Four corners/i)).toBeVisible()
      await confirmBtn.click()

      await expect(guestPage.getByText(/You won! Win confirmed|Win Confirmed|BINGO/i).first()).toBeVisible({
        timeout: 45_000,
      })

      await expect(hostPage.getByRole('heading', { name: /Win Confirmed/i })).toBeVisible({
        timeout: 30_000,
      })
      await hostPage.getByRole('button', { name: /^End Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 45_000 })
    } finally {
      if (guestContext) await guestContext.close()
      await hostContext.close()
      await deleteSmokeGame(gameCode)
    }
  })
})
