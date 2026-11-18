import { expect, test } from '@playwright/test'
import { mockRpc } from './support/rpc-mock'

const WORKSPACE = '/workspace/acme/widgets/cart-flow'

test('the workspace groups the graph by layer and opens a node', async ({ page }) => {
  await mockRpc(page)
  await page.goto(WORKSPACE)

  await expect(page.getByRole('heading', { level: 1, name: 'How the cart works' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: /^UI/ })).toBeVisible()
  await page
    .getByRole('button', { name: /cart thunks/ })
    .first()
    .click()

  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'cart thunks' })).toBeVisible()
  await expect(panel.getByText('Dispatches cart updates.')).toBeVisible()

  await panel.getByRole('button', { name: /Open src\/cart\/thunks\.ts/ }).click()
  await expect(panel.getByText('export function addItem(item: Item) {')).toBeVisible()
})

test('the workspace diagram focuses a node and opens its evidence', async ({ page }) => {
  await mockRpc(page)
  await page.goto(WORKSPACE)

  await page.getByRole('button', { name: 'Diagram' }).click()
  await expect(page.getByRole('heading', { name: 'Cart dataflow' })).toBeVisible()

  await page.getByRole('button', { name: 'addItem' }).click()
  await expect(page.getByRole('heading', { name: 'addItem' })).toBeVisible()
  await page
    .getByRole('button', { name: 'Open src/cart/thunks.ts:L9–27 in the source panel' })
    .first()
    .click()
  await expect(
    page.getByRole('dialog').getByText('export function addItem(item: Item) {'),
  ).toBeVisible()
})

test('the workspace switches to the file tree and table', async ({ page }) => {
  await mockRpc(page)
  await page.goto(WORKSPACE)

  await page.getByRole('button', { name: 'Tree' }).click()
  await expect(page.getByRole('navigation', { name: 'Repository files' })).toBeVisible()
  await page.getByRole('button', { name: /thunks\.ts/ }).click()
  await expect(
    page.getByRole('dialog').getByText('export function addItem(item: Item) {'),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Table' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('button', { name: 'src/cart/thunks.ts' })).toBeVisible()
})
