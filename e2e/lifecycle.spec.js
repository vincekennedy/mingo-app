import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Game lifecycle smoke', () => {
  test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

  test('host creates, guest joins with display name, guest claims win', async ({ browser }) => {
    let gameCode = null
    const hostContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    let guestContext = null

    try {
      await hostPage.goto('/')
      // Wait out auth overlay if any
      await expect(hostPage.getByRole('button', { name: /^Login$/i })).toBeVisible({ timeout: 60_000 })
      await hostPage.getByRole('button', { name: /^Login$/i }).click()
      await hostPage.locator('input[name="email"]').fill(hostEmail)
      await hostPage.locator('input[name="password"]').fill(hostPassword)
      await hostPage.locator('form').getByRole('button', { name: /^Login$/i }).click()

      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 45_000 })

      await hostPage.getByRole('button', { name: /Create New Game/i }).click()
      await hostPage.getByPlaceholder(/Enter a title/i).fill('Smoke Test Bingo')
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')

      const itemInputs = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs.nth(i).fill(`Smoke item ${i + 1}`)
      }

      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })

      gameCode = (await hostPage.locator('.font-mono.text-purple-600').first().innerText()).trim()
      expect(gameCode).toMatch(/^[A-Z0-9]{5}$/)

      const guestName = `SmokeGuest${Date.now().toString(36).slice(-4)}`
      guestContext = await browser.newContext()
      const guestPage = await guestContext.newPage()
      await guestPage.goto('/')
      await expect(guestPage.getByRole('button', { name: /^Join Game$/i })).toBeVisible({ timeout: 60_000 })
      await guestPage.getByPlaceholder(/Enter 5-digit code/i).fill(gameCode)
      await guestPage.getByRole('button', { name: /^Join Game$/i }).click()

      // Scope to the guest modal — landing still has "Join Game" (case-insensitive clash)
      const guestModal = guestPage.getByRole('dialog', { name: /Join as guest/i })
      await expect(guestModal).toBeVisible()
      await guestModal.getByLabel(/Display name/i).fill(guestName)
      await guestModal.getByRole('button', { name: 'Join game', exact: true }).click()

      // Play board: white card with CSS grid of cell buttons
      const board = guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')
      await expect(board).toBeVisible({ timeout: 60_000 })

      await expect(hostPage.getByText(guestName, { exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(hostPage.getByText(new RegExp(`^${guestName}-[a-z0-9]{4}$`, 'i'))).toHaveCount(0)

      // Mark every non-FREE cell so a line is guaranteed regardless of shuffle
      const cells = board.locator('button')
      const cellCount = await cells.count()
      expect(cellCount).toBeGreaterThanOrEqual(9)
      for (let i = 0; i < cellCount; i++) {
        const cell = cells.nth(i)
        const label = (await cell.innerText()).trim()
        if (/^FREE$/i.test(label)) continue
        await cell.click()
      }

      const confirmBtn = hostPage.getByRole('button', { name: /Confirm Win/i })
      await expect(confirmBtn).toBeVisible({ timeout: 60_000 })
      await confirmBtn.click()

      await expect(guestPage.getByText(/You won! Win confirmed|Win Confirmed|BINGO/i).first()).toBeVisible({
        timeout: 45_000,
      })

      // Host end-game dialog after confirm
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
