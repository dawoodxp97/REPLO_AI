import {
  CommitSha,
  type PreflightResult,
  type RepoLimitData,
  type RepositorySource,
} from '@replo/contracts'
import {
  detectFramework,
  inventory,
  limitBreach,
  type Inventory,
  type RepoLimits,
} from '@replo/repo-analysis'
import type { z } from 'zod'
import { notFound } from '../../platform/errors'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { classifyGithubFailure, repoApiPath, type GithubRest } from '../../platform/github/client'
import {
  CommitRef,
  GitBlob,
  GitTree,
  GithubRepository,
  PackageManifestJson,
} from '../../platform/github/schemas'

export interface InstallationDirectory {
  activeInstallations(userId: string): Promise<{ githubInstallationId: number }[]>
  installationToken(installationId: number): Promise<string | undefined>
  userCanAccess(userId: string, repository: { owner: string; name: string }): Promise<boolean>
}

export type PreflightRefusal =
  | { code: 'REPO_NOT_ACCESSIBLE' }
  | { code: 'REPO_TOO_LARGE'; data: RepoLimitData }
  | { code: 'UNSUPPORTED_LANGUAGE' }

export interface ResolvedRepository {
  repo: z.output<typeof GithubRepository>
  installationId: number | null
  commitSha: string
  summary: Inventory
  framework: string | null
}

export interface Preflight {
  resolve(
    userId: string,
    source: RepositorySource,
  ): Promise<Outcome<ResolvedRepository, PreflightRefusal>>
  run(userId: string, source: RepositorySource): Promise<Outcome<PreflightResult, PreflightRefusal>>
}

interface PreflightDeps {
  rest: GithubRest
  installations: InstallationDirectory
  limits: RepoLimits
}

interface Access {
  token: string | undefined
  installationId: number | null
  repo: z.output<typeof GithubRepository>
}

type TreeEntries = z.output<typeof GitTree>['tree']

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const NAME_PATTERN = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/

const ownerAndName = (url: string): [owner: string, name: string] | undefined => {
  const [owner = '', name = ''] = new URL(url).pathname.split('/').filter(Boolean)
  const trimmed = name.replace(/\.git$/, '')
  return OWNER_PATTERN.test(owner) && NAME_PATTERN.test(trimmed) ? [owner, trimmed] : undefined
}

export function createPreflight(deps: PreflightDeps): Preflight {
  const { rest, installations, limits } = deps

  const repoPath = (access: Access) => repoApiPath(access.repo.owner.login, access.repo.name)

  const fetchFromRepo = <S extends z.ZodType>(access: Access, path: string, schema: S) =>
    rest.request(`${repoPath(access)}${path}`, schema, { token: access.token })

  const userMayRead = async (
    userId: string,
    repo: z.output<typeof GithubRepository>,
  ): Promise<boolean> => {
    try {
      return await installations.userCanAccess(userId, {
        owner: repo.owner.login,
        name: repo.name,
      })
    } catch (error) {
      if (classifyGithubFailure(error) !== 'other') return false
      throw error
    }
  }

  const resolveAccess = async (
    userId: string,
    source: RepositorySource,
  ): Promise<Access | undefined> => {
    if (source.kind === 'public_url') {
      const parsed = ownerAndName(source.url)
      if (!parsed) return undefined
      const repo = await rest.request(repoApiPath(...parsed), GithubRepository)
      return repo ? { token: undefined, installationId: null, repo } : undefined
    }
    for (const installation of await installations.activeInstallations(userId)) {
      const token = await installations.installationToken(installation.githubInstallationId)
      if (!token) continue
      const repo = await rest.request(`/repositories/${source.githubRepoId}`, GithubRepository, {
        token,
      })
      if (!repo) continue
      const permitted = await userMayRead(userId, repo)
      if (permitted) return { token, installationId: installation.githubInstallationId, repo }
    }
    return undefined
  }

  const resolveCommit = async (access: Access, ref: string): Promise<string> => {
    if (CommitSha.safeParse(ref).success) return ref
    const commit = await fetchFromRepo(access, `/commits/${encodeURIComponent(ref)}`, CommitRef)
    return commit?.sha ?? notFound('Ref')
  }

  const readFramework = async (access: Access, tree: TreeEntries): Promise<string | null> => {
    const manifest = tree.find((entry) => entry.type === 'blob' && entry.path === 'package.json')
    if (!manifest) return null
    const blob = await fetchFromRepo(access, `/git/blobs/${manifest.sha}`, GitBlob)
    return blob ? frameworkFromManifest(blob) : null
  }

  const resolve: Preflight['resolve'] = async (userId, source) => {
    const access = await resolveAccess(userId, source)
    if (!access) return refused({ code: 'REPO_NOT_ACCESSIBLE' })

    const commitSha = await resolveCommit(access, source.ref ?? access.repo.default_branch)
    const tree = await fetchFromRepo(access, `/git/trees/${commitSha}?recursive=1`, GitTree)
    if (!tree) return refused({ code: 'REPO_NOT_ACCESSIBLE' })
    if (tree.truncated) {
      return refused({
        code: 'REPO_TOO_LARGE',
        data: {
          metric: 'files',
          value: tree.tree.filter((entry) => entry.type === 'blob').length,
          limit: limits.maxFiles,
        },
      })
    }

    const summary = inventory(tree.tree)
    const breach = limitBreach(summary, limits)
    if (breach) return refused({ code: 'REPO_TOO_LARGE', data: breach })
    if (summary.indexableFileCount === 0) return refused({ code: 'UNSUPPORTED_LANGUAGE' })

    return ok({
      repo: access.repo,
      installationId: access.installationId,
      commitSha,
      summary,
      framework: await readFramework(access, tree.tree),
    })
  }

  return {
    resolve,

    async run(userId, source) {
      const resolution = await resolve(userId, source)
      if (resolution.kind === 'refused') return resolution
      const { repo, commitSha, summary, framework } = resolution.value
      return ok({
        repo: {
          owner: repo.owner.login,
          name: repo.name,
          isPrivate: repo.private,
          defaultBranch: repo.default_branch,
          license: repo.license?.spdx_id ?? null,
        },
        commitSha,
        stats: { ...summary, framework },
      })
    },
  }
}

export function frameworkFromManifest(blob: z.output<typeof GitBlob>): string | null {
  const text =
    blob.encoding === 'base64' ? Buffer.from(blob.content, 'base64').toString('utf8') : blob.content
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return null
  }
  const manifest = PackageManifestJson.safeParse(json)
  return manifest.success ? detectFramework(manifest.data) : null
}
