import { expect, test } from '@playwright/test'
import { mockRpc, rpcError } from './support/rpc-mock'

test('sign-in page ships a nonce-based Content Security Policy and no CSP violations', async ({
  page,
}) => {
  await mockRpc(page)
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
  await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toBeVisible()
  expect(violations).toEqual([])
})

test('sign-in page fits the viewport without horizontal scrolling', async ({ page }) => {
  await mockRpc(page)
  await page.goto('/login')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('sign-in offers only configured providers and keeps email available', async ({ page }) => {
  await mockRpc(page, {
    'auth.providers': () => ({ body: { google: false, github: true } }),
  })
  await page.goto('/login')

  await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveCount(0)
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
})

test('email sign-in works without OAuth providers configured', async ({ page }) => {
  await mockRpc(page, {
    'auth.providers': () => ({ body: { google: false, github: false } }),
  })
  await page.goto('/login')

  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Continue with/ })).toHaveCount(0)
  await expect(page.getByText('or use email', { exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Create account' }).click()
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible()
})

test('unavailable providers leave email available and can be retried', async ({ page }) => {
  let available = false
  await mockRpc(page, {
    'auth.providers': () =>
      available ? { body: { google: false, github: true } } : rpcError('SERVICE_UNAVAILABLE', 503),
  })
  await page.goto('/login')

  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry sign-in methods' })).toBeVisible()
  available = true
  await page.getByRole('button', { name: 'Retry sign-in methods' }).click()
  await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toBeVisible()
})

test('a signed-out visitor is sent to sign-in', async ({ page }) => {
  await mockRpc(page, { 'me.get': () => rpcError('UNAUTHORIZED', 401) })

  await page.goto('/import')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in to Replo' })).toBeVisible()
})
