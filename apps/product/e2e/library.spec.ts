import { expect, test } from '@playwright/test'
import { mockRpc, type RpcCall } from './support/rpc-mock'

test('a developer shares a tutorial by link and makes it private again', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/library')
  await expect(page.getByText('How the cart works')).toBeVisible()
  await page.getByText('Sharing', { exact: true }).click()
  await page.getByRole('radio', { name: /Link/ }).check()

  await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveValue(
    /\?share=share-token-123$/,
  )
  await page.getByRole('radio', { name: /Private/ }).check()
  await expect
    .poll(() => calls.filter((call) => call.path === 'tutorials.setVisibility').length)
    .toBeGreaterThanOrEqual(2)
})

test('deleting a tutorial names what goes away and needs confirmation', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/library')
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('Its versions and your progress are deleted.')).toBeVisible()
  await page.getByRole('button', { name: 'Delete tutorial' }).click()

  await expect.poll(() => calls.some((call) => call.path === 'tutorials.delete')).toBe(true)
})

test('removing a repository names the tutorials and progress that go with it', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/repositories')
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByText('deletes your tutorials and reading progress for it')).toBeVisible()
  await page.getByRole('button', { name: 'Remove repository' }).click()

  await expect.poll(() => calls.some((call) => call.path === 'repositories.remove')).toBe(true)
})
