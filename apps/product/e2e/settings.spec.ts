import { expect, test } from '@playwright/test'
import { Preferences } from '@replo/contracts'
import { DEFAULT_PREFERENCES } from './fixtures/handlers'
import { USER } from './fixtures/recorded'
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

test('account deletion needs the typed confirmation', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/settings/profile')
  await page.getByRole('button', { name: 'Delete account' }).click()
  const dialog = page.getByRole('alertdialog')
  const confirm = dialog.getByRole('button', { name: 'Delete my account' })
  await expect(confirm).toBeDisabled()

  await dialog.getByLabel('Type delete to confirm').fill('DELETE')
  await expect(confirm).toBeEnabled()
  await confirm.click()

  await expect.poll(() => calls.some((call) => call.path === 'me.deleteAccount')).toBe(true)
})

test('the default model is saved', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/settings/models')
  await page.getByLabel('Model').selectOption('claude-haiku-5-5')
  await page.getByRole('button', { name: 'Save model' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible()
  expect(calls.find((call) => call.path === 'models.setPreferences')?.input).toMatchObject({
    defaultModel: 'claude-haiku-5-5',
  })
})

test('profile never offers connections to unconfigured sign-in providers', async ({ page }) => {
  await mockRpc(page, {
    'me.get': () => ({
      body: { ...USER, signInMethods: { password: true, google: false, github: false } },
    }),
    'auth.providers': () => ({ body: { google: false, github: false } }),
  })
  await page.goto('/settings/profile')

  await expect(page.getByText('Unavailable', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('link', { name: /Connect (Google|GitHub)/ })).toHaveCount(0)
})
