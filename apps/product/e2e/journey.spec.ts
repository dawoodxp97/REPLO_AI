import { expect, test } from '@playwright/test'
import { ESTIMATE, JOB, JOB_ID, PREFLIGHT, SAVED_KEY } from './fixtures/recorded'
import { TUTORIAL_ID } from './fixtures/tutorial'
import { mockEventStream, mockRpc, type RpcCall } from './support/rpc-mock'

test('the PRD journey: import, watch progress, read a lesson, answer its quiz and share', async ({
  page,
}) => {
  const calls: RpcCall[] = []
  await mockRpc(
    page,
    {
      'keys.list': () => ({ body: [SAVED_KEY] }),
      'repositories.preflight': () => ({ body: PREFLIGHT }),
      'repositories.estimate': () => ({ body: ESTIMATE }),
      'repositories.import': () => ({ body: JOB }),
      'jobs.get': () => ({
        body: {
          ...JOB,
          status: 'succeeded',
          stage: 'publish',
          progress: 100,
          spentUsd: 0.4,
          tutorialId: TUTORIAL_ID,
        },
      }),
    },
    calls,
  )
  await mockEventStream(page, JOB_ID, [
    `id: 1\nevent: succeeded\ndata: ${JSON.stringify({ id: 1, jobId: JOB_ID, type: 'succeeded', stage: null, data: null, at: '2026-10-23T10:20:00.000Z' })}\n\n`,
  ])

  await page.goto('/import')
  await page.getByLabel('GitHub repository URL').fill('https://github.com/acme/widgets')
  await page.getByRole('button', { name: 'Check repository' }).click()
  await expect(page.getByText('3f9c1a2')).toBeVisible()
  await page.getByRole('button', { name: 'Generate tutorial' }).click()

  await expect(page).toHaveURL(new RegExp(`/jobs/${JOB_ID}$`))
  await expect(page.getByRole('link', { name: 'Open the tutorial' })).toBeVisible()
  await page.getByRole('link', { name: 'Open the tutorial' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'How the cart works' })).toBeVisible()
  await page.getByRole('link', { name: 'The button dispatches a thunk' }).first().click()
  await page.getByRole('radio', { name: 'A thunk' }).check()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Correct.', { exact: true })).toBeVisible()

  await page.goto('/library')
  await page.getByText('Sharing', { exact: true }).click()
  await page.getByRole('radio', { name: /Link/ }).check()
  await expect(page.getByRole('textbox', { name: 'Share link' })).toBeVisible()
  expect(calls.some((call) => call.path === 'tutorials.createShareLink')).toBe(true)
})
