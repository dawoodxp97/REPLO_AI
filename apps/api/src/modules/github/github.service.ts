import type { GithubRepoDto } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import {
  classifyGithubFailure,
  GithubApiError,
  collectPages,
  GithubTokenRejectedError,
  pageQuery,
  repoApiPath,
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

const TOKEN_REUSE_MARGIN_MS = 5 * 60_000
const TOKEN_DEFAULT_LIFETIME_MS = 50 * 60_000
const TOKEN_INFLIGHT_MS = 10_000

interface MintedToken {
  token: string
  expiresAt: number | undefined
}

interface CachedToken {
  reuseUntil: number
  token: Promise<MintedToken | undefined>
}

const reuseDeadline = (expiresAt: number | undefined) =>
  expiresAt === undefined
    ? Date.now() + TOKEN_DEFAULT_LIFETIME_MS
    : expiresAt - TOKEN_REUSE_MARGIN_MS

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

  const tokenCache = new Map<number, CachedToken>()

  const mintInstallationToken = async (installationId: number): Promise<MintedToken | undefined> => {
    const body = await rest.request(
      `/app/installations/${installationId}/access_tokens`,
      InstallationToken,
      { method: 'POST', token: appJwt() },
    )
    if (!body) return undefined
    const expiresAt = body.expires_at ? Date.parse(body.expires_at) : Number.NaN
    return { token: body.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined }
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
      const failure = classifyGithubFailure(error)
      if (failure === 'token_rejected') throw new GithubTokenRejectedError()
      if (error instanceof GithubApiError) return []
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
        const repository = await rest.request(repoApiPath(owner, name), GithubRepository, {
          token: userToken,
        })
        return repository !== undefined
      } catch (error) {
        if (classifyGithubFailure(error) === 'token_rejected') throw new GithubTokenRejectedError()
        throw error
      }
    },

    activeInstallations(userId) {
      return githubInstallationsRepo(db).listActiveForUser(userId)
    },

    installationToken(installationId) {
      if (!deps.app) return Promise.resolve(undefined)
      const cached = tokenCache.get(installationId)
      if (cached && cached.reuseUntil > Date.now())
        return cached.token.then((minted) => minted?.token)
      const entry: CachedToken = {
        reuseUntil: Date.now() + TOKEN_INFLIGHT_MS,
        token: mintInstallationToken(installationId),
      }
      tokenCache.set(installationId, entry)
      entry.token.then(
        (minted) => {
          if (tokenCache.get(installationId) !== entry) return
          if (minted === undefined) tokenCache.delete(installationId)
          else entry.reuseUntil = reuseDeadline(minted.expiresAt)
        },
        () => {
          if (tokenCache.get(installationId) === entry) tokenCache.delete(installationId)
        },
      )
      return entry.token.then((minted) => minted?.token)
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
