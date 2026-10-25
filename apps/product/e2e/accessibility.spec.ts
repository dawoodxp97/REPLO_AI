import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mockRpc } from './support/rpc-mock'

const PAGES = [
  { name: 'sign-in', path: '/login' },
  { name: 'tutorial overview', path: '/tutorials/acme/widgets/cart-flow' },
  { name: 'lesson', path: '/tutorials/acme/widgets/cart-flow/learn/ch1/l1' },
  { name: 'library', path: '/library' },
  { name: 'import', path: '/import' },
  { name: 'API keys', path: '/settings/keys' },
] as const

const BLOCKING_IMPACTS: readonly string[] = ['serious', 'critical']

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme })

    for (const target of PAGES) {
      test(`${target.name} has no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await mockRpc(page)
        await page.goto(target.path)
        await expect(page.locator('h1').first()).toBeVisible()

        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const blocking = results.violations
          .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
          .map(
            (violation) =>
              `${violation.impact}: ${violation.id} ${violation.nodes.map((node) => node.target.join(' ') + ' ' + node.html.slice(0, 160)).join(' | ')}`,
          )

        expect(blocking).toEqual([])
      })
    }
  })
}

test('reduced motion turns off the loading animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockRpc(page)
  await page.goto('/library')

  const duration = await page.evaluate(() => {
    const element = document.querySelector('[aria-busy="true"]')
    return element ? getComputedStyle(element).animationDuration : null
  })
  expect(duration === null || parseFloat(duration) <= 0.001).toBe(true)
})
