import { expect, test } from '@playwright/test'
import { AddKeyInput, type KeyDto } from '@replo/contracts'
import { SAVED_KEY, USER } from './fixtures/recorded'
import { mockRpc } from './support/rpc-mock'

test('a developer saves, checks and deletes an API key', async ({ page }) => {
  let keys: KeyDto[] = [SAVED_KEY]

  await mockRpc(page, {
    'me.get': () => ({ body: USER }),
    'keys.list': () => ({ body: keys }),
    'keys.add': ({ input }) => {
      const { provider, label, apiKey } = AddKeyInput.parse(input)
      const added: KeyDto = {
        id: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
        provider,
        label,
        last4: apiKey.slice(-4),
        lastValidatedAt: null,
        createdAt: '2026-10-23T10:05:00.000Z',
      }
      keys = [...keys, added]
      return { body: added }
    },
    'keys.validate': () => ({ body: { valid: true } }),
    'keys.delete': () => {
      keys = keys.filter((key) => key.id !== SAVED_KEY.id)
      return { body: { ok: true } }
    },
  })

  await page.goto('/settings/keys')
  await expect(page.getByText('…a1b2')).toBeVisible()

  await page.getByLabel('API key').fill('sk-or-v1-test-key-0000')
  await page.getByRole('button', { name: 'Save key' }).click()
  await expect(page.getByText('…0000')).toBeVisible()
  await expect(page.getByLabel('API key')).toHaveValue('')

  await page.getByRole('button', { name: 'Check key' }).first().click()
  await expect(page.getByText('The provider accepted this key.').first()).toBeVisible()

  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('button', { name: 'Delete key' }).click()
  await expect(page.getByText('…a1b2')).toBeHidden()
})

test('the saved key list shows only the last four characters', async ({ page }) => {
  await mockRpc(page, {
    'me.get': () => ({ body: USER }),
    'keys.list': () => ({ body: [SAVED_KEY] }),
  })

  await page.goto('/settings/keys')

  await expect(page.getByText('…a1b2')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('sk-or')
})
