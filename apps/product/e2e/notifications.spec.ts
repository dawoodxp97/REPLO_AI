import { expect, test } from '@playwright/test'
import { API_URL, APP_ORIGIN } from './support/origins'
import { mockRpc, type RpcCall } from './support/rpc-mock'

test('the bell shows unread notifications and marks them all read', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, {}, calls)

  await page.goto('/')
  await page.getByRole('button', { name: 'Notifications, 2 unread' }).click()

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('Tutorial ready')).toBeVisible()
  await page.getByRole('button', { name: 'Mark all read' }).click()

  await expect
    .poll(() => calls.some((call) => call.path === 'notifications.markAllRead'))
    .toBe(true)
})

test('the bell takes its count from the notifications stream when the API pushes one', async ({
  page,
}) => {
  const streamed = new Promise<void>((resolve) => {
    void page.route(`${API_URL}/notifications/stream`, async (route) => {
      resolve()
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'access-control-allow-origin': APP_ORIGIN,
          'access-control-allow-credentials': 'true',
        },
        body: `event: unread\ndata: ${JSON.stringify({ count: 7 })}\n\n`,
      })
    })
  })
  await mockRpc(page)

  await page.goto('/')
  await streamed
  await expect(page.getByRole('button', { name: 'Notifications, 7 unread' })).toBeVisible()
})
