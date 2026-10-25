import { expect, test } from '@playwright/test'
import { mockRpc } from './support/rpc-mock'

test('the operator screen is not found for other users', async ({ page }) => {
  await mockRpc(page)

  const response = await page.goto('/operator')

  expect(response?.status()).toBe(404)
  await expect(page.getByText('This page could not be found')).toBeVisible()
})
