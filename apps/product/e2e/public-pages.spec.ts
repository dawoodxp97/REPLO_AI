import { expect, test } from '@playwright/test'
import { APP_ORIGIN } from './support/origins'

const OVERVIEW = `${APP_ORIGIN}/courses/acme/widgets/cart-flow`

test('a course page is never cached by shared caches', async ({ request }) => {
  const response = await request.get(OVERVIEW)

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('private')
})
