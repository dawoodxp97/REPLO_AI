import { expect, test } from '@playwright/test'
import { SEARCH_RESULTS } from './fixtures/handlers'
import { mockRpc } from './support/rpc-mock'

test('home shows the library counts and resumes the last lesson', async ({ page }) => {
  await mockRpc(page)

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
  await expect(page.getByText('Tutorials', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Resume' })).toHaveAttribute(
    'href',
    '/tutorials/acme/widgets/cart-flow?resume',
  )
})

test('an empty workspace explains setup and offers direct next steps', async ({ page }) => {
  await mockRpc(page, {
    'dashboard.summary': () => ({
      body: {
        counts: { total: 0, draft: 0, private: 0, link: 0, public: 0 },
        resume: null,
        jobsInFlight: [],
      },
    }),
    'dashboard.recent': () => ({ body: { items: [], nextCursor: null } }),
  })
  await page.goto('/')

  const setup = page.getByRole('region', { name: 'Make an unfamiliar codebase feel familiar.' })
  await expect(setup.getByRole('link', { name: 'New tutorial' })).toHaveAttribute('href', '/import')
  await expect(setup.getByRole('link', { name: 'Manage keys' })).toHaveAttribute(
    'href',
    '/settings/keys',
  )
  await expect(setup.getByText('Review the pre-flight check and run estimate.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('search finds a lesson in the library and opens it', async ({ page }) => {
  await mockRpc(page)

  await page.goto('/')
  await page.getByRole('combobox', { name: 'Search your library' }).fill('thunk')

  await page.getByRole('link', { name: 'The button dispatches a thunk' }).click()
  await expect(page).toHaveURL(/\/learn\/ch1\/l1$/)
})

test('a lesson hit links to its lesson without a matching tutorial hit', async ({ page }) => {
  await mockRpc(page, {
    'search.own': () => ({ body: { ...SEARCH_RESULTS, tutorials: [] } }),
  })

  await page.goto('/')
  await page.getByRole('combobox', { name: 'Search your library' }).fill('thunk')

  await expect(page.getByRole('link', { name: /The button dispatches a thunk/ })).toHaveAttribute(
    'href',
    '/tutorials/acme/widgets/cart-flow/learn/ch1/l1',
  )
})
