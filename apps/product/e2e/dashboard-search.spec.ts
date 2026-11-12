import { expect, test, type Page } from '@playwright/test'
import { SEARCH_RESULTS } from './fixtures/handlers'
import { mockRpc, type RpcCall } from './support/rpc-mock'

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

test('home lists tutorials with progress and says what a new tutorial will run on', async ({
  page,
}) => {
  await mockRpc(page)

  await page.goto('/')

  const shelf = page.getByRole('region', { name: 'Your tutorials' })
  await expect(shelf.getByRole('link', { name: 'How the cart works' })).toHaveAttribute(
    'href',
    '/tutorials/acme/widgets/cart-flow',
  )
  await expect(shelf.getByRole('link', { name: 'View library' })).toHaveAttribute(
    'href',
    '/library',
  )

  const workspace = page.getByRole('complementary', { name: 'Workspace summary' })
  await expect(workspace.getByRole('link', { name: /API key/ })).toHaveAttribute(
    'href',
    '/settings/keys',
  )
  await expect(workspace.getByRole('link', { name: /GitHub/ })).toContainText('Connected')
  await expect(workspace.getByText('1 of 2 correct')).toBeVisible()
  await expect(
    workspace.getByRole('link', { name: 'New tutorial for acme/widgets' }),
  ).toHaveAttribute('href', '/import?repo=acme%2Fwidgets')
})

test('home says a key is missing when none is saved', async ({ page }) => {
  await mockRpc(page, { 'keys.list': () => ({ body: [] }) })

  await page.goto('/')

  await expect(
    page
      .getByRole('complementary', { name: 'Workspace summary' })
      .getByRole('link', { name: /API key/ }),
  ).toContainText('Add a key to generate tutorials')
})

test('the account pill shows who is signed in and links to every settings section', async ({
  page,
}) => {
  await mockRpc(page)
  await page.goto('/')

  await page.getByRole('button', { name: /^Account:/ }).click()

  const account = page.getByRole('navigation', { name: 'Account' })
  await expect(page.getByText('ada@example.com')).toBeVisible()
  await expect(account.getByRole('link', { name: /API keys/ })).toContainText('1 saved')
  await expect(account.getByRole('link', { name: /Models/ })).toHaveAttribute(
    'href',
    '/settings/models',
  )

  await account.getByRole('link', { name: /Profile/ }).click()
  await expect(page).toHaveURL(/\/settings\/profile$/)
  await expect(account).toBeHidden()
})

test('the account pill switches the theme and signs out', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)
  await page.goto('/')

  await page.getByRole('button', { name: /^Account:/ }).click()
  await page.getByRole('button', { name: 'Dark' }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(calls.map((call) => call.path)).toContain('auth.signOut')
})

test('an empty workspace explains setup and offers direct next steps', async ({ page }) => {
  await mockRpc(page, {
    'dashboard.summary': () => ({
      body: {
        counts: { total: 0, draft: 0, private: 0, link: 0, public: 0 },
        resume: null,
        jobsInFlight: [],
        reading: {
          lessonsCompleted: 0,
          lessonsCompletedLast7Days: 0,
          quizAnswers: 0,
          quizAnswersCorrect: 0,
        },
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

test('search finds a lesson in the library and opens it', async ({ page, isMobile }) => {
  await mockRpc(page)

  await page.goto('/')
  await searchFor(page, 'thunk', isMobile)

  await page.getByRole('link', { name: 'The button dispatches a thunk' }).click()
  await expect(page).toHaveURL(/\/learn\/ch1\/l1$/)
})

test('a lesson hit links to its lesson without a matching tutorial hit', async ({
  page,
  isMobile,
}) => {
  await mockRpc(page, {
    'search.own': () => ({ body: { ...SEARCH_RESULTS, tutorials: [] } }),
  })

  await page.goto('/')
  await searchFor(page, 'thunk', isMobile)

  await expect(page.getByRole('link', { name: /The button dispatches a thunk/ })).toHaveAttribute(
    'href',
    '/tutorials/acme/widgets/cart-flow/learn/ch1/l1',
  )
})

async function searchFor(page: Page, text: string, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Search your library' }).click()
  await page.getByRole('combobox', { name: 'Search your library' }).fill(text)
}
