import { expect, test } from '@playwright/test'
import type { TutorialRef } from '@replo/contracts'
import { JOB, JOB_ID } from './fixtures/recorded'
import { TUTORIAL_ID, TUTORIAL_TITLE } from './fixtures/tutorial'
import { mockRpc, type RpcCall } from './support/rpc-mock'

const OVERVIEW = '/tutorials/acme/widgets/cart-flow'
const LESSON_ONE = `${OVERVIEW}/learn/ch1/l1`

test('the public overview reads without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto(OVERVIEW)

  await expect(page.getByRole('heading', { level: 1, name: TUTORIAL_TITLE })).toBeVisible()
  await expect(page.getByRole('link', { name: 'The button dispatches a thunk' })).toBeVisible()
  await expect(
    page.getByText('Why is the thunk not awaited before the store updates?'),
  ).toBeVisible()
  await context.close()
})

test('resume redirects to the next unfinished lesson', async ({ page }) => {
  await page.goto(`${OVERVIEW}?resume`)
  await expect(page).toHaveURL(/\/learn\/ch1\/l2$/)
})

test('the overview shows its diagram as text steps and lays the diagram out lazily', async ({
  page,
}) => {
  await page.goto(OVERVIEW)
  await expect(page.getByText('Cart button → Cart thunk: dispatches')).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'The cart button dispatches a thunk that writes to the store.' }),
  ).toBeVisible()
  await expect(page.locator('[role="img"] svg').first()).toBeVisible({ timeout: 20_000 })
})

test('a lesson opens its cited source range and the keyboard moves through the tutorial', async ({
  page,
}) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto(LESSON_ONE)
  await expect(
    page.getByRole('heading', { level: 1, name: 'The button dispatches a thunk' }),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Open src/ui/ProductCard.tsx:L18–22 in the source panel' })
    .click()
  await expect(page).toHaveURL(/ref=r-button/)
  await expect(page.getByLabel('src/ui/ProductCard.tsx, lines 18 to 22').last()).toBeVisible()
  await expect
    .poll(() => page.locator('.code-token').count(), { timeout: 20_000 })
    .toBeGreaterThan(0)

  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press('n')
  await expect(page).toHaveURL(/\/learn\/ch1\/l2$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Where the state lives' })).toBeVisible()

  await page.keyboard.press('m')
  await expect.poll(() => calls.some((call) => call.path === 'learning.markLesson')).toBe(true)
})

test('a lesson shows its first cited source before any reference is chosen', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'phones open the source in a sheet only when a reference is chosen')
  await mockRpc(page)

  await page.goto(LESSON_ONE)
  const source = page.getByRole('complementary', { name: 'Source' })
  await expect(source.getByLabel('src/ui/ProductCard.tsx, lines 18 to 22')).toBeVisible()
  await expect(page).not.toHaveURL(/ref=/)
  await expect(
    page.getByRole('button', { name: 'Open src/ui/ProductCard.tsx:L18–22 in the source panel' }),
  ).toHaveAttribute('aria-current', 'true')
})

test('a quiz answer is graded and explained with its source', async ({ page }) => {
  await mockRpc(page)

  await page.goto(LESSON_ONE)
  await expect(page.getByRole('heading', { name: 'Check your understanding' })).toBeVisible()
  await page.getByRole('radio', { name: 'A thunk' }).check()
  await page.getByRole('button', { name: 'Check answer' }).click()

  await expect(page.getByText('Correct.', { exact: true })).toBeVisible()
  await expect(
    page.getByText('The button dispatches the cart thunk, which writes to the store.'),
  ).toBeVisible()
})

test('the progress page resumes reading and lists history', async ({ page }) => {
  await mockRpc(page)

  await page.goto(`${OVERVIEW}/progress`)
  await expect(page.getByRole('heading', { name: '1 of 3 lessons complete' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Resume reading' })).toHaveAttribute(
    'href',
    /\/learn\/ch1\/l2$/,
  )
  await expect(page.getByRole('button', { name: 'Mark as not complete' })).toBeVisible()
})

const finishedJob = (tutorial: TutorialRef | null) => ({
  ...JOB,
  status: 'succeeded',
  stage: 'publish',
  progress: 100,
  spentUsd: 0.4,
  tutorialId: tutorial ? TUTORIAL_ID : null,
  tutorial,
})

test('the job page links to the finished tutorial', async ({ page }) => {
  await mockRpc(page, {
    'jobs.get': () => ({
      body: finishedJob({ owner: 'acme', repo: 'widgets', slug: 'cart-flow' }),
    }),
    'tutorials.list': () => ({ body: { items: [], nextCursor: null } }),
  })

  await page.goto(`/jobs/${JOB_ID}`)
  await expect(page.getByRole('link', { name: 'Open the tutorial' })).toHaveAttribute(
    'href',
    OVERVIEW,
  )
})

test('the job page falls back to the library when the tutorial is gone', async ({ page }) => {
  await mockRpc(page, { 'jobs.get': () => ({ body: finishedJob(null) }) })

  await page.goto(`/jobs/${JOB_ID}`)
  await expect(page.getByRole('link', { name: 'Open your library' })).toHaveAttribute(
    'href',
    '/library',
  )
})

test('the source explorer lists the repository tree and opens a file at the pinned commit', async ({
  page,
}) => {
  await mockRpc(page)

  await page.goto(`${OVERVIEW}/code`)
  const files = page.getByRole('navigation', { name: 'Repository files' })
  await expect(files.getByText('cart/')).toBeVisible()
  await expect(files.getByText('binary or over 1 MB')).toBeVisible()

  await files.getByRole('link', { name: 'thunks.ts' }).click()

  await expect(page).toHaveURL(/path=src%2Fcart%2Fthunks\.ts/)
  await expect(page.getByLabel('src/cart/thunks.ts')).toContainText('export function addItem')
})

test('the source explorer opens the first cited file when none is chosen', async ({ page }) => {
  await mockRpc(page)

  await page.goto(`${OVERVIEW}/code`)
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByLabel('src/cart/thunks.ts')).toContainText('export function addItem')
  await expect(
    page
      .getByRole('navigation', { name: 'Repository files' })
      .getByRole('link', { name: /thunks\.ts/ }),
  ).toHaveAttribute('aria-current', 'page')
})
