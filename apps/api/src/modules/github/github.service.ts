import type { GithubRepoDto } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { collectPages, pageQuery, type GithubRest } from '../../platform/github/client'
import {
  InstallationRepositoriesPage,
  InstallationToken,
  UserInstallationsPage,
} from '../../platform/github/schemas'
import { createAppJwt } from '../../platform/github/app-jwt'
import { installUrlFor, requireGithubApp, type GithubAppCredentials } from './github.app'
import { suspendedAt } from './github.events'
import { githubInstallationsRepo } from './github.repo'

interface ActiveInstallation {
  githubInstallationId: number
  accountLogin: string
}

export type LinkOutcome = 'linked' | 'not_accessible' | 'owned_by_another_user'

export interface GithubService {
  installUrl(): string | null
  listRepos(userId: string): Promise<GithubRepoDto[]>
  activeInstallations(userId: string): Promise<ActiveInstallation[]>
  installationToken(installationId: number): Promise<string | undefined>
  linkInstallation(input: {
    userId: string
    installationId: number
    userToken: string
  }): Promise<LinkOutcome>
}

export function createGithubService(deps: {
  db: Db
  rest: GithubRest
  app: GithubAppCredentials | undefined
}): GithubService {
  const { db, rest } = deps

  const appJwt = () => {
    const app = requireGithubApp(deps.app)
    return createAppJwt(app.appId, app.privateKey, Math.floor(Date.now() / 1000))
  }

  const installationRepositories = (token: string) =>
    collectPages((page) =>
      rest
        .request(`/installation/repositories?${pageQuery(page)}`, InstallationRepositoriesPage, {
          token,
        })
        .then((body) => body?.repositories),
    )

  const userInstallations = (token: string) =>
    collectPages((page) =>
      rest
        .request(`/user/installations?${pageQuery(page)}`, UserInstallationsPage, { token })
        .then((body) => body?.installations),
    )

  const service: GithubService = {
    installUrl() {
      const app = deps.app
      if (!app) return null
      return installUrlFor(app.slug)
    },

    async listRepos(userId) {
      if (!deps.app) return []
      const repos: GithubRepoDto[] = []
      for (const installation of await service.activeInstallations(userId)) {
        const token = await service.installationToken(installation.githubInstallationId)
        if (!token) continue
        for (const repo of await installationRepositories(token)) {
          repos.push({
            githubRepoId: repo.id,
            owner: repo.owner.login,
            name: repo.name,
            isPrivate: repo.private,
            defaultBranch: repo.default_branch,
            installationId: installation.githubInstallationId,
          })
        }
      }
      return repos
    },

    activeInstallations(userId) {
      return githubInstallationsRepo(db).listActiveForUser(userId)
    },

    async installationToken(installationId) {
      if (!deps.app) return undefined
      const body = await rest.request(
        `/app/installations/${installationId}/access_tokens`,
        InstallationToken,
        { method: 'POST', token: appJwt() },
      )
      return body?.token
    },

    async linkInstallation({ userId, installationId, userToken }) {
      const installation = (await userInstallations(userToken)).find(
        (candidate) => candidate.id === installationId,
      )
      if (!installation) return 'not_accessible'

      const installationsRepo = githubInstallationsRepo(db)
      const existing = await installationsRepo.findByInstallationId(installationId)
      if (existing && existing.userId !== userId && !existing.deletedAt)
        return 'owned_by_another_user'

      const written = await installationsRepo.upsertForUser({
        githubInstallationId: installationId,
        userId,
        accountLogin: installation.account.login,
        suspendedAt: suspendedAt(installation),
      })
      return written ? 'linked' : 'owned_by_another_user'
    },
  }

  return service
}
