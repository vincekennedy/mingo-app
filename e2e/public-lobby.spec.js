import { test, expect } from '@playwright/test'
import { deleteSmokeGame } from './helpers/cleanupSmokeGame.js'

const hostEmail = process.env.SMOKE_HOST_EMAIL
const hostPassword = process.env.SMOKE_HOST_PASSWORD
const hasHostCreds = Boolean(hostEmail && hostPassword)

test.describe('Public lobby', () => {
  test.skip(!hasHostCreds, 'Set SMOKE_HOST_EMAIL and SMOKE_HOST_PASSWORD (mingo-local test host)')

  test('public game appears in lobby; private does not; guest joins from lobby', async ({
    browser,
  }) => {
    let publicCode = null
    let privateCode = null
    const hostContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    let guestContext = null

    async function createGameOnHost({ title, visibility }) {
      await hostPage.getByRole('button', { name: /Create New Game/i }).click()
      await hostPage.getByPlaceholder(/Enter a title/i).fill(title)
      await hostPage.getByLabel(/^Board Size$/i).selectOption('3')
      await hostPage.getByLabel(/^Visibility$/i).selectOption(visibility)

      const itemInputs = hostPage.locator('input[placeholder^="Item "]')
      for (let i = 0; i < 8; i++) {
        await itemInputs.nth(i).fill(`${title} item ${i + 1}`)
      }

      await hostPage.getByRole('button', { name: /^Create Game$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Game Created/i })).toBeVisible({
        timeout: 45_000,
      })
      const code = (await hostPage.locator('.font-mono.text-purple-600').first().innerText()).trim()
      expect(code).toMatch(/^[A-Z0-9]{5}$/)

      if (visibility === 'public') {
        await expect(hostPage.getByText(/^Public$/)).toBeVisible()
      } else {
        await expect(hostPage.getByText(/^Private$/)).toBeVisible()
      }

      await hostPage.getByRole('button', { name: /Back to Dashboard/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({
        timeout: 45_000,
      })
      return code
    }

    try {
      await hostPage.goto('/')
      await expect(hostPage.getByRole('button', { name: /^Login$/i })).toBeVisible({
        timeout: 60_000,
      })
      await hostPage.getByRole('button', { name: /^Login$/i }).click()
      await hostPage.locator('input[name="email"]').fill(hostEmail)
      await hostPage.locator('input[name="password"]').fill(hostPassword)
      await hostPage.locator('form').getByRole('button', { name: /^Login$/i }).click()
      await expect(hostPage.getByRole('heading', { name: /Welcome/i })).toBeVisible({
        timeout: 45_000,
      })

      privateCode = await createGameOnHost({
        title: 'Lobby Private Smoke',
        visibility: 'private',
      })
      publicCode = await createGameOnHost({
        title: 'Lobby Public Smoke',
        visibility: 'public',
      })

      guestContext = await browser.newContext()
      const guestPage = await guestContext.newPage()
      await guestPage.goto('/')
      await expect(guestPage.getByTestId('public-lobby')).toBeVisible({ timeout: 60_000 })

      const publicCard = guestPage.getByTestId(`public-lobby-game-${publicCode}`)
      await expect(publicCard).toBeVisible({ timeout: 45_000 })
      await expect(publicCard.getByText(/Lobby Public Smoke/i)).toBeVisible()
      await expect(guestPage.getByTestId(`public-lobby-game-${privateCode}`)).toHaveCount(0)

      await publicCard.getByRole('button', { name: /^Join$/i }).click()

      const guestName = `LobbyGuest${Date.now().toString(36).slice(-4)}`
      const guestModal = guestPage.getByRole('dialog', { name: /Join as guest/i })
      await expect(guestModal).toBeVisible()
      await guestModal.getByLabel(/Display name/i).fill(guestName)
      await guestModal.getByRole('button', { name: 'Join game', exact: true }).click()

      const board = guestPage.locator('.bg-white.rounded-2xl.shadow-2xl .grid')
      await expect(board).toBeVisible({ timeout: 60_000 })
      await expect(guestPage.getByText(/^Public$/)).toBeVisible()
    } finally {
      if (guestContext) await guestContext.close()
      await hostContext.close()
      await deleteSmokeGame(publicCode)
      await deleteSmokeGame(privateCode)
    }
  })
})
