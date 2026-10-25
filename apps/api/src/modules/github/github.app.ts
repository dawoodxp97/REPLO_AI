import { ORPCError } from '@orpc/server'
import type { Config } from '../../platform/config'

export interface GithubAppCredentials {
  appId: string
  privateKey: string
  slug: string
}

export function githubAppFrom(config: Config): GithubAppCredentials | undefined {
  const { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: privateKey, GITHUB_APP_SLUG: slug } = config
  return appId && privateKey && slug ? { appId, privateKey, slug } : undefined
}

export function requireGithubApp(app: GithubAppCredentials | undefined): GithubAppCredentials {
  if (!app)
    throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'GitHub App is not configured' })
  return app
}

export const installUrlFor = (slug: string) => `https://github.com/apps/${slug}/installations/new`
