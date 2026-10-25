import { expect, test } from '@playwright/test'

test('the sign-in page loads no diagram renderer in its first JavaScript', async ({ page }) => {
  const scripts: string[] = []
  page.on('response', (response) => {
    if (response.url().endsWith('.js')) scripts.push(response.url())
  })

  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  const bodies = await Promise.all(
    scripts.map(async (url) => {
      const response = await page.request.get(url)
      return response.text()
    }),
  )
  expect(bodies.some((body) => body.includes('securityLevel'))).toBe(false)
  expect(scripts.length).toBeGreaterThan(0)
})
