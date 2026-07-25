import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Named theme presets', () => {
  test('home preference persists across reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /^Login$/i })).toBeVisible({ timeout: 60_000 })

    const shell = page.locator('[data-theme].mingo-shell').first()
    await expect(shell).toHaveAttribute('data-theme', 'party')

    await page.getByTestId('home-theme-swatch-ocean').click()
    await expect(shell).toHaveAttribute('data-theme', 'ocean')

    await page.reload()
    await expect(page.getByRole('button', { name: /^Login$/i })).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('[data-theme].mingo-shell').first()).toHaveAttribute('data-theme', 'ocean')
  })

  test.describe('Per-game theme', () => {
    test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

    test('host creates with ocean; guest play shell matches', async ({ browser }) => {
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
        await hostPage.getByPlaceholder(/Enter a title/i).fill('Theme Ocean Smoke')
        await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
        await hostPage.getByTestId('setup-theme-swatch-ocean').click()
        await expect(hostPage.locator('[data-theme].mingo-shell').first()).toHaveAttribute(
          'data-theme',
          'ocean'
        )

        const itemInputs = hostPage.locator('input[placeholder^="Item "]')
        for (let i = 0; i < 8; i++) {
          await itemInputs.nth(i).fill(`Theme item ${i + 1}`)
        }

        await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
        await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
          timeout: 45_000,
        })
        await expect(hostPage.locator('[data-theme].mingo-shell').first()).toHaveAttribute(
          'data-theme',
          'ocean'
        )

        gameCode = (await hostPage.getByTestId('game-code').innerText()).trim()
        expect(gameCode).toMatch(/^[A-Z0-9]{5}$/)

        const guestName = `ThemeGuest${Date.now().toString(36).slice(-4)}`
        guestContext = await browser.newContext()
        const guestPage = await guestContext.newPage()
        await guestPage.goto('/')
        await expect(guestPage.getByRole('button', { name: /^Join Game$/i })).toBeVisible({
          timeout: 60_000,
        })
        await guestPage.getByPlaceholder(/Enter join code/i).fill(gameCode)
        await guestPage.getByRole('button', { name: /^Join Game$/i }).click()

        const guestModal = guestPage.getByRole('dialog', { name: /Join game/i })
        await expect(guestModal).toBeVisible()
        await guestModal.getByLabel(/Display name/i).fill(guestName)
        await guestModal.getByRole('button', { name: /Join as guest/i }).click()

        const board = guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')
        await expect(board).toBeVisible({ timeout: 60_000 })
        await expect(guestPage.locator('[data-theme].mingo-shell').first()).toHaveAttribute(
          'data-theme',
          'ocean'
        )
      } finally {
        if (gameCode) {
          await deleteSmokeGame(gameCode).catch(() => {})
        }
        await guestContext?.close()
        await hostContext.close()
      }
    })
  })
})
