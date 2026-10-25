import type { Tx } from '../../platform/db/client'
import type { ChangeOutcome, InstallationChange, RepositoryLinkSink } from '../github/github.ports'
import type { TutorialManager } from '../tutorials/manager.service'
import { repositoriesRepo } from './repositories.repo'

export interface RepositoryChanges extends RepositoryLinkSink {
  applyChange(tx: Tx, change: InstallationChange): Promise<ChangeOutcome>
}

export function createRepositoryChanges(
  tutorials: Pick<TutorialManager, 'recordPush'>,
): RepositoryChanges {
  return {
    async applyChange(tx, change) {
      const repos = repositoriesRepo(tx)
      switch (change.kind) {
        case 'installation_removed':
          await repos.revokeInstallation(change.installationId)
          return 'applied'
        case 'repositories_removed':
          if (change.githubRepoIds.length > 0)
            await repos.revokeInstallationRepositories(change.installationId, change.githubRepoIds)
          return 'applied'
        case 'repository_deleted':
          await repos.revokeRepository(change.githubRepoId)
          return 'applied'
        case 'repository_updated':
          await repos.updateMetadata(change.repository)
          return 'applied'
        case 'push': {
          const repository = await repos.findByGithubRepoId(change.githubRepoId)
          if (!repository || change.ref !== `refs/heads/${repository.defaultBranch}`)
            return 'skipped'
          if (change.paths.length === 0) return 'skipped'
          await tutorials.recordPush(tx, {
            repositoryId: repository.id,
            commitSha: change.commitSha,
            paths: change.paths,
            pushedAt: new Date(),
          })
          return 'applied'
        }
      }
    },
  }
}
