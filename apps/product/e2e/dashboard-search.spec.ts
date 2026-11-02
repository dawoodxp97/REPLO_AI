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
