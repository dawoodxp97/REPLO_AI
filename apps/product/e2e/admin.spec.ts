import { expect, test } from '@playwright/test'
import { ADMIN_JOBS, ADMIN_QUEUES, ADMIN_USERS } from './fixtures/admin'
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, mockRpc } from './support/rpc-mock'

const ADMIN_COOKIE = {
  name: ADMIN_COOKIE_NAME,
  value: ADMIN_COOKIE_VALUE,
  domain: 'localhost',
  path: '/',
}

const ADMIN_HEADINGS = [
  'Users',
  'Repositories',
  'Courses',
  'Generations in flight',
  'Failures last 24h',
  'Snapshot storage',
] as const

test.describe('admin access', () => {
  test('a non-admin is turned away before the shell renders', async ({ page }) => {
    await mockRpc(page)

    const response = await page.goto('/admin')

    expect(response?.status()).toBe(404)
    await expect(page.getByText('This page could not be found')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveCount(0)
  })

  test('an admin reaches the overview with platform totals', async ({ page }) => {
    await mockRpc(page)
    await page.context().addCookies([ADMIN_COOKIE])

    await page.goto('/admin')

    const main = page.getByRole('main')
    await expect(main.getByText('Platform-wide totals', { exact: false })).toBeVisible()
    for (const label of ADMIN_HEADINGS) {
      await expect(main.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('an admin sees every user with their counts', async ({ page }) => {
    await mockRpc(page)
    await page.context().addCookies([ADMIN_COOKIE])

    await page.goto('/admin/users')

    const main = page.getByRole('main')
    for (const user of ADMIN_USERS) {
      await expect(main.getByText(user.name ?? user.email ?? user.id)).toBeVisible()
    }
  })

  test('an admin can filter jobs by status', async ({ page }) => {
    await mockRpc(page)
    await page.context().addCookies([ADMIN_COOKIE])

    await page.goto('/admin/jobs')

    const main = page.getByRole('main')
    await expect(main.getByRole('link', { name: ADMIN_JOBS[0]!.jobId.slice(0, 8) })).toBeVisible()
    await main.getByRole('button', { name: 'Failed', exact: true }).click()
    await expect(main.getByText(ADMIN_JOBS[1]!.errorCode!, { exact: true })).toBeVisible()
  })

  test('an admin sees queue depth and system health', async ({ page }) => {
    await mockRpc(page)
    await page.context().addCookies([ADMIN_COOKIE])

    await page.goto('/admin/system')

    const main = page.getByRole('main')
    for (const queue of ADMIN_QUEUES) {
      await expect(main.getByText(queue.name, { exact: true })).toBeVisible()
    }
  })
})