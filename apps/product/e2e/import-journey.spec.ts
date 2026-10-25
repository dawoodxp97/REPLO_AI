import { expect, test } from '@playwright/test'
import {
  ESTIMATE,
  JOB,
  JOB_ID,
  MODEL_CATALOG,
  PREFLIGHT,
  SAVED_KEY,
  USER,
} from './fixtures/recorded'
import { mockEventStream, mockRpc, rpcError, type RpcCall } from './support/rpc-mock'

const REPO_URL = 'https://github.com/acme/widgets'

const stageStarted = `id: 1\nevent: stage_started\ndata: ${JSON.stringify({
  id: 1,
  jobId: JOB_ID,
  type: 'stage_started',
  stage: 'ingest',
  data: null,
  at: '2026-10-23T10:00:00.000Z',
})}\n\n`

test('a developer checks a public repository and starts a tutorial', async ({ page }) => {
  const calls: RpcCall[] = []
  await mockRpc(
    page,
    {
      'me.get': () => ({ body: USER }),
      'github.listRepos': () => ({ body: [] }),
      'github.installUrl': () => ({
        body: { url: 'https://github.com/apps/replo/installations/new' },
      }),
      'keys.list': () => ({ body: [SAVED_KEY] }),
      'models.catalog': () => ({ body: MODEL_CATALOG }),
      'repositories.preflight': () => ({ body: PREFLIGHT }),
      'repositories.estimate': () => ({ body: ESTIMATE }),
      'repositories.import': () => ({ body: JOB }),
    },
    calls,
  )
  await mockEventStream(page, JOB_ID, [stageStarted])

  await page.goto('/import')
  await page.getByLabel('GitHub repository URL').fill(REPO_URL)
  await page.getByRole('button', { name: 'Check repository' }).click()
  await expect(page.getByText('3f9c1a2')).toBeVisible()
  await expect(page.getByText('Next.js')).toBeVisible()
  await expect(page.getByText('$0.42')).toBeVisible()

  await page.getByRole('button', { name: 'Generate tutorial' }).click()

  await expect(page).toHaveURL(new RegExp(`/jobs/${JOB_ID}$`))
  const start = calls.find((call) => call.path === 'repositories.import')
  expect(start?.headers['idempotency-key']).toBeTruthy()
})

test('a retried import reuses its Idempotency-Key', async ({ page }) => {
  const calls: RpcCall[] = []
  let attempts = 0
  await mockRpc(
    page,
    {
      'me.get': () => ({ body: USER }),
      'github.listRepos': () => ({ body: [] }),
      'github.installUrl': () => ({ body: { url: 'https://github.com/apps/replo' } }),
      'keys.list': () => ({ body: [SAVED_KEY] }),
      'models.catalog': () => ({ body: MODEL_CATALOG }),
      'repositories.estimate': () => ({ body: ESTIMATE }),
      'repositories.import': () => {
        attempts += 1
        return attempts === 1 ? rpcError('KEY_CHECK_UNAVAILABLE', 503) : { body: JOB }
      },
    },
    calls,
  )
  await mockEventStream(page, JOB_ID, [stageStarted])

  await page.goto('/import')
  await page.getByLabel('GitHub repository URL').fill(REPO_URL)
  await page.getByRole('button', { name: 'Generate tutorial' }).click()
  await expect(page.getByText('The provider did not answer the key check.')).toBeVisible()
  await page.getByRole('button', { name: 'Generate tutorial' }).click()
  await expect(page).toHaveURL(new RegExp(`/jobs/${JOB_ID}$`))

  const keys = calls
    .filter((call) => call.path === 'repositories.import')
    .map((call) => call.headers['idempotency-key'])
  expect(keys).toHaveLength(2)
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).toBe(keys[0])
})

test('a repository over the size limit is refused with the limit named', async ({ page }) => {
  await mockRpc(page, {
    'me.get': () => ({ body: USER }),
    'github.listRepos': () => ({ body: [] }),
    'github.installUrl': () => ({ body: { url: 'https://github.com/apps/replo' } }),
    'keys.list': () => ({ body: [SAVED_KEY] }),
    'models.catalog': () => ({ body: MODEL_CATALOG }),
    'repositories.preflight': () =>
      rpcError('REPO_TOO_LARGE', 422, { metric: 'files', value: 6200, limit: 5000 }),
    'repositories.estimate': () => ({ body: ESTIMATE }),
  })

  await page.goto('/import')
  await page.getByLabel('GitHub repository URL').fill(REPO_URL)
  await page.getByRole('button', { name: 'Check repository' }).click()

  await expect(page.getByRole('alert').filter({ hasText: '5,000 files' })).toBeVisible()
})
