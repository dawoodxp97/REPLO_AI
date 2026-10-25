import { expect, test } from '@playwright/test'
import { APP_ORIGIN } from './support/origins'

const OVERVIEW = `${APP_ORIGIN}/tutorials/acme/widgets/cart-flow`

test('a public tutorial offers a social preview image', async ({ request }) => {
  const response = await request.get(`${OVERVIEW}/opengraph-image`)

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
})

test('a tutorial page is never cached by shared caches', async ({ request }) => {
  const response = await request.get(OVERVIEW)

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('private')
})

test('a public tutorial exposes its title and social metadata', async ({ page }) => {
  await page.goto('/tutorials/acme/widgets/cart-flow')

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/tutorials\/acme\/widgets\/cart-flow\/opengraph-image/,
  )
  await expect(page).toHaveTitle(/How the cart works/)
})
