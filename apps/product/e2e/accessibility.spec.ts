import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { DEFAULT_PREFERENCES } from './fixtures/handlers'
import { JOB_ID } from './fixtures/recorded'
import { mockRpc } from './support/rpc-mock'
import { MIN_TOUCH_TARGET, undersizedTouchTargets } from './support/touch-targets'

const TUTORIAL = '/tutorials/acme/widgets/cart-flow'

const PAGES = [
  { name: 'sign-in', path: '/login' },
  { name: 'dashboard', path: '/' },
  { name: 'library', path: '/library' },
  { name: 'repositories', path: '/repositories' },
  { name: 'import', path: '/import' },
  { name: 'job', path: `/jobs/${JOB_ID}` },
  { name: 'profile settings', path: '/settings/profile' },
  { name: 'preference settings', path: '/settings/preferences' },
  { name: 'GitHub settings', path: '/settings/github' },
  { name: 'API keys', path: '/settings/keys' },
  { name: 'model settings', path: '/settings/models' },
  { name: 'tutorial overview', path: TUTORIAL },
  { name: 'lesson', path: `${TUTORIAL}/learn/ch1/l1` },
  { name: 'source explorer', path: `${TUTORIAL}/code` },
  { name: 'progress', path: `${TUTORIAL}/progress` },
  { name: 'not found', path: '/does-not-exist' },
] as const

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme })

    for (const target of PAGES) {
      test(`${target.name} has no accessibility violations`, async ({ page }) => {
        await mockRpc(page, {
          'settings.get': () => ({ body: { ...DEFAULT_PREFERENCES, theme: scheme } }),
        })
        await page.goto(target.path)
        await expect(page.locator('h1').first()).toBeVisible()

        const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
        const violations = results.violations.map(
          (violation) =>
            `${violation.impact}: ${violation.id} ${violation.nodes.map((node) => node.target.join(' ') + ' ' + node.html.slice(0, 160)).join(' | ')}`,
        )

        expect(violations).toEqual([])
      })
    }
  })
}

test.describe('touch targets', () => {
  for (const target of PAGES) {
    test(`${target.name} keeps controls at least ${MIN_TOUCH_TARGET} px on touch screens`, async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, 'touch sizes apply to coarse pointers only')
      await mockRpc(page)
      await page.goto(target.path)
      await expect(page.locator('h1').first()).toBeVisible()

      expect(await undersizedTouchTargets(page)).toEqual([])
    })
  }
})

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
