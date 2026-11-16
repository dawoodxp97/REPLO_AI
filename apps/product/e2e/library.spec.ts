import { expect, test } from '@playwright/test'
import { COURSE_SUMMARY } from './fixtures/course'
import { mockRpc, type RpcCall } from './support/rpc-mock'

test('the library is narrowed by text and reading state, then cleared', async ({ page }) => {
  const auth = {
    ...COURSE_SUMMARY,
    id: '5f0e7a2c-3b1d-4c6e-9a8f-2d4b6c8e0a11',
    slug: 'auth-flow',
    title: 'Auth flow',
    repo: 'gateway',
    progress: 1,
  }
  await mockRpc(page, {
    'courses.list': () => ({ body: { items: [COURSE_SUMMARY, auth], nextCursor: null } }),
  })
  await page.goto('/library')
  const rows = page.getByRole('main').getByRole('listitem')
  await expect(rows).toHaveCount(2)

  await page.getByRole('searchbox', { name: 'Filter by title or repository' }).fill('gateway')
  await expect(rows).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: '1 of 2 courses shown' })).toBeVisible()

  await page.getByRole('checkbox', { name: 'Hide finished' }).check()
  await expect(page.getByText('No courses match')).toBeVisible()

  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(rows).toHaveCount(2)
})

test('the library sort order is chosen from a menu', async ({ page }) => {
  const auth = {
    ...COURSE_SUMMARY,
    id: '5f0e7a2c-3b1d-4c6e-9a8f-2d4b6c8e0a11',
    slug: 'auth-flow',
    title: 'Auth flow',
    updatedAt: '2020-01-01T00:00:00.000Z',
  }
  await mockRpc(page, {
    'courses.list': () => ({ body: { items: [COURSE_SUMMARY, auth], nextCursor: null } }),
  })
  await page.goto('/library')
  const titles = page.getByRole('main').getByRole('listitem').getByRole('link')
  await expect(titles.first()).toHaveText('How the cart works')

  await page.getByRole('button', { name: 'Recently updated' }).click()
  await page.getByRole('menuitemradio', { name: 'Title' }).click()

  await expect(titles.first()).toHaveText('Auth flow')
})

test('deleting a course names what goes away and needs confirmation', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/library')
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('Its versions and your progress are deleted.')).toBeVisible()
  await page.getByRole('button', { name: 'Delete course' }).click()

  await expect.poll(() => calls.some((call) => call.path === 'courses.delete')).toBe(true)
})

test('removing a repository names the courses and progress that go with it', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/repositories')
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.getByText('deletes your courses and reading progress for it')).toBeVisible()
  await page.getByRole('button', { name: 'Remove repository' }).click()

  await expect.poll(() => calls.some((call) => call.path === 'repositories.remove')).toBe(true)
})
