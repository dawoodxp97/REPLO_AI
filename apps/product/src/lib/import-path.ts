import type { RepositorySource } from '@replo/contracts'

export const NEW_TUTORIAL_LABEL = 'New tutorial'

const REPO_PARAM = /^[\w.-]+\/[\w.-]+$/

export function importPath(repository?: {
  owner: string
  name: string
  isPrivate: boolean
}): string {
  if (!repository || repository.isPrivate) return '/import'
  return `/import?repo=${encodeURIComponent(`${repository.owner}/${repository.name}`)}`
}

export function sourceFromRepoParam(param: string | undefined): RepositorySource | undefined {
  if (param === undefined || !REPO_PARAM.test(param)) return undefined
  return { kind: 'public_url', url: `https://github.com/${param}` }
}
