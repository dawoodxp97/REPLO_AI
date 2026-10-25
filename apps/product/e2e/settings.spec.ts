import { expect, test } from '@playwright/test'
import { Preferences } from '@replo/contracts'
import { DEFAULT_PREFERENCES } from './fixtures/handlers'
import { API_URL, APP_ORIGIN } from './support/origins'
import { mockRpc, type RpcCall } from './support/rpc-mock'

test('a theme change is saved and applied to the page', async ({ page }) => {
  let preferences = DEFAULT_PREFERENCES
  await mockRpc(page, {
    'settings.get': () => ({ body: preferences }),
    'settings.update': ({ input }) => {
      preferences = { ...preferences, ...Preferences.partial().parse(input) }
      return { body: preferences }
    },
  })

  await page.goto('/settings/preferences')
  await page.getByLabel('Theme').selectOption('dark')

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
})

test('other sessions are signed out and the result is reported', async ({ page }) => {
  await mockRpc(page)
  await page.route(`${API_URL}/api/auth/revoke-other-sessions`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': APP_ORIGIN,
        'access-control-allow-credentials': 'true',
      },
      body: JSON.stringify({ status: true }),
    }),
  )

  await page.goto('/settings/profile')
  await page.getByRole('button', { name: 'Sign out other sessions' }).click()

  await expect(
    page.getByRole('status').filter({ hasText: 'Other sessions are signed out.' }),
  ).toBeVisible()
})

test('the model preset is saved', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/settings/models')
  await page.getByLabel('Preset').selectOption('quality')
  await page.getByRole('button', { name: 'Save models' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible()
  expect(calls.find((call) => call.path === 'models.setPreferences')?.input).toMatchObject({
    preset: 'quality',
  })
})
