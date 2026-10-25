import { expect, test } from '@playwright/test'
import { JOB, JOB_ID } from './fixtures/recorded'
import { mockJobEvents, mockRpc, sseFrame, type RpcCall } from './support/rpc-mock'

test('the progress feed resumes from Last-Event-ID without duplicating stages', async ({
  page,
}) => {
  await mockRpc(page)
  await mockJobEvents(page, JOB_ID, ({ attempt }) => {
    if (attempt === 1) {
      return `retry: 100\n${sseFrame(1, 'stage_started', { id: 1, jobId: JOB_ID, type: 'stage_started', stage: 'ingest', data: null, at: '2026-10-23T10:00:00.000Z' })}${sseFrame(2, 'stage_completed', { id: 2, jobId: JOB_ID, type: 'stage_completed', stage: 'ingest', data: null, at: '2026-10-23T10:00:05.000Z' })}`
    }
    return `retry: 100\n${sseFrame(2, 'stage_completed', { id: 2, jobId: JOB_ID, type: 'stage_completed', stage: 'ingest', data: null, at: '2026-10-23T10:00:05.000Z' })}${sseFrame(3, 'stage_started', { id: 3, jobId: JOB_ID, type: 'stage_started', stage: 'index', data: null, at: '2026-10-23T10:00:09.000Z' })}`
  })

  await page.goto(`/jobs/${JOB_ID}`)

  const ingest = page.getByRole('listitem').filter({ hasText: 'Download and extract repository' })
  const index = page.getByRole('listitem').filter({ hasText: 'Build static index' })
  await expect(ingest).toContainText('done')
  await expect(index).toContainText('running')
  await expect(page.getByText('running', { exact: true })).toHaveCount(1)
})

test('a running job can be canceled from the job page', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(page, { 'jobs.get': () => ({ body: { ...JOB, status: 'running' } }) }, calls)

  await page.goto(`/jobs/${JOB_ID}`)
  await page.getByRole('button', { name: 'Cancel generation' }).click()

  await expect(page.getByText('Canceled', { exact: true })).toBeVisible()
  expect(calls.some((call) => call.path === 'jobs.cancel')).toBe(true)
})

test('a failed job can be retried from its last checkpoint', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(
    page,
    { 'jobs.get': () => ({ body: { ...JOB, status: 'failed', error: { code: 'STAGE_FAILED' } } }) },
    calls,
  )

  await page.goto(`/jobs/${JOB_ID}`)
  await expect(page.getByText('Error code: STAGE_FAILED')).toBeVisible()
  await page.getByRole('button', { name: 'Retry from the last checkpoint' }).click()

  await expect(page.getByText('Queued', { exact: true })).toBeVisible()
  expect(calls.some((call) => call.path === 'jobs.retry')).toBe(true)
})
