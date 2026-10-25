import { expect, test } from '@playwright/test'
import type { RepositoryListItem } from '@replo/contracts'
import { JOB_ID, USER } from './fixtures/recorded'
import { mockRpc } from './support/rpc-mock'

const REPOSITORIES: RepositoryListItem[] = [
  {
    repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    owner: 'acme',
    name: 'widgets',
    isPrivate: false,
    defaultBranch: 'main',
    latestJob: { jobId: JOB_ID, status: 'running' },
  },
  {
    repositoryId: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
    owner: 'acme',
    name: 'internal-tools',
    isPrivate: true,
    defaultBranch: 'develop',
    latestJob: null,
  },
]

test('my repositories shows each repository with its latest job state', async ({ page }) => {
  await mockRpc(page, {
    'me.get': () => ({ body: USER }),
    'repositories.list': () => ({ body: { items: REPOSITORIES, nextCursor: null } }),
  })

  await page.goto('/repositories')

  await expect(page.getByText('acme/widgets')).toBeVisible()
  await expect(page.getByText('Running')).toBeVisible()
  await expect(page.getByRole('link', { name: 'View job' })).toHaveAttribute(
    'href',
    `/jobs/${JOB_ID}`,
  )
  await expect(page.getByText('acme/internal-tools')).toBeVisible()
  await expect(page.getByText('Private')).toBeVisible()
})

test('my repositories with no imports offers the import action', async ({ page }) => {
  await mockRpc(page, {
    'me.get': () => ({ body: USER }),
    'repositories.list': () => ({ body: { items: [], nextCursor: null } }),
  })

  await page.goto('/repositories')

  await expect(page.getByRole('heading', { name: 'No repositories yet' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Import a repository' }).first()).toHaveAttribute(
    'href',
    '/import',
  )
})
