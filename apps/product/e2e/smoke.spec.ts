import { expect, test } from '@playwright/test'
import { mockRpc, rpcError } from './support/rpc-mock'

test('sign-in page ships a nonce-based Content Security Policy and no CSP violations', async ({
  page,
}) => {
  const violations: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
      violations.push(message.text())
    }
  })

  const response = await page.goto('/login')

  expect(response?.headers()['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/,
  )
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await expect(page.getByRole('heading', { name: 'Sign in to Replo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  expect(violations).toEqual([])
})

test('sign-in page fits the viewport without horizontal scrolling', async ({ page }) => {
  await page.goto('/login')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a signed-out visitor is sent to sign-in', async ({ page }) => {
  await mockRpc(page, { 'me.get': () => rpcError('UNAUTHORIZED', 401) })

  await page.goto('/import')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in to Replo' })).toBeVisible()
})
