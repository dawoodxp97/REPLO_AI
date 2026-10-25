import type { Tx } from '../../platform/db/client'

export interface RepositoryMetadata {
  githubRepoId: number
  owner: string
  name: string
  isPrivate: boolean
  defaultBranch: string
  license: string | null
}

export type InstallationChange =
  | { kind: 'installation_removed'; installationId: number }
  | { kind: 'repositories_removed'; installationId: number; githubRepoIds: number[] }
  | { kind: 'repository_deleted'; githubRepoId: number }
  | { kind: 'repository_updated'; repository: RepositoryMetadata }
  | { kind: 'push'; githubRepoId: number; ref: string; commitSha: string; paths: string[] }

export type ChangeOutcome = 'applied' | 'skipped'

export interface RepositoryLinkSink {
  applyChange(tx: Tx, change: InstallationChange): Promise<ChangeOutcome>
}
