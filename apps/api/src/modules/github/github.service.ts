import type { GithubRepoDto } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import {
  collectPages,
  GithubApiError,
  GithubTokenRejectedError,
  pageQuery,
  type GithubRest,
} from '../../platform/github/client'
import {
  GithubRepository,
  InstallationRepositoriesPage,
  InstallationToken,
  UserInstallationsPage,
} from '../../platform/github/schemas'
import { createAppJwt } from '../../platform/github/app-jwt'
import { installUrlFor, requireGithubApp, type GithubAppCredentials } from './github.app'
import { suspendedAt } from './github.events'
import { toRepositorySummary } from './github.mapper'
import { githubInstallationsRepo } from './github.repo'

interface ActiveInstallation {
  githubInstallationId: number
  accountLogin: string
}

export interface UserTokenSource {
  githubAccessToken(userId: string): Promise<string | undefined>
}

export interface RepositoryRef {
  owner: string
  name: string
}

export { GithubTokenRejectedError }

export type LinkOutcome = 'linked' | 'not_accessible' | 'owned_by_another_user'

export interface GithubService {
  installUrl(): string | null
  listRepos(userId: string): Promise<GithubRepoDto[]>
  activeInstallations(userId: string): Promise<ActiveInstallation[]>
  installationToken(installationId: number): Promise<string | undefined>
  userCanAccess(userId: string, repository: RepositoryRef): Promise<boolean>
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
  userTokens: UserTokenSource
}): GithubService {
  const { db, rest } = deps

  const appJwt = () => {
    const app = requireGithubApp(deps.app)
    return createAppJwt(app.appId, app.privateKey, Math.floor(Date.now() / 1000))
  }

  const userInstallationRepositories = (userToken: string, installationId: number) =>
    collectPages((page) =>
      rest
        .request(
          `/user/installations/${installationId}/repositories?${pageQuery(page)}`,
          InstallationRepositoriesPage,
          { token: userToken },
        )
        .then((body) => body?.repositories),
    )

  const reposOfInstallation = async (
    userToken: string,
    installation: ActiveInstallation,
  ): Promise<GithubRepoDto[]> => {
    try {
      const repositories = await userInstallationRepositories(
        userToken,
        installation.githubInstallationId,
      )
      return repositories.map((repository) => ({
        ...toRepositorySummary(repository),
        installationId: installation.githubInstallationId,
      }))
    } catch (error) {
      if (error instanceof GithubApiError) {
        if (error.status === 401) throw new GithubTokenRejectedError()
        return []
      }
      throw error
    }
  }

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
      const userToken = await deps.userTokens.githubAccessToken(userId)
      if (!userToken) return []
      const installations = await service.activeInstallations(userId)
      const perInstallation = await Promise.all(
        installations.map((installation) => reposOfInstallation(userToken, installation)),
      )
      return perInstallation.flat()
    },

    async userCanAccess(userId, { owner, name }) {
      const userToken = await deps.userTokens.githubAccessToken(userId)
      if (!userToken) return false
      try {
        const repository = await rest.request(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
          GithubRepository,
          { token: userToken },
        )
        return repository !== undefined
      } catch (error) {
        if (error instanceof GithubApiError && error.status === 401)
          throw new GithubTokenRejectedError()
        throw error
      }
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
