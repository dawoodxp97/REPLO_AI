import { z } from 'zod'

export const GithubRepository = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  private: z.boolean(),
  default_branch: z.string(),
  owner: z.object({ login: z.string() }),
  license: z.object({ spdx_id: z.string().nullable() }).nullish(),
})
export type GithubRepository = z.infer<typeof GithubRepository>

export const InstallationToken = z.object({ token: z.string().min(1) })

export const UserInstallation = z.object({
  id: z.number().int().positive(),
  account: z.object({ login: z.string() }),
  suspended_at: z.string().nullish(),
})
export type UserInstallation = z.infer<typeof UserInstallation>

export const UserInstallationsPage = z.object({
  installations: z.array(UserInstallation),
})

export const InstallationRepositoriesPage = z.object({
  repositories: z.array(GithubRepository),
})

export const CommitRef = z.object({ sha: z.string().regex(/^[0-9a-f]{40}$/) })

export const GitTree = z.object({
  truncated: z.boolean(),
  tree: z.array(
    z.object({
      path: z.string(),
      type: z.enum(['blob', 'tree', 'commit']),
      size: z.number().int().nonnegative().optional(),
      sha: z.string(),
    }),
  ),
})

export const GitBlob = z.object({
  content: z.string(),
  encoding: z.enum(['base64', 'utf-8']),
})

export const PackageManifestJson = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
})
