import { authed } from '../../orpc'
import { GithubTokenRejectedError } from './github.service'

export const githubRouter = {
  installUrl: authed.github.installUrl.handler(({ context }) => {
    const url = context.services.github.installUrl()
    return { url }
  }),
  listRepos: authed.github.listRepos.handler(async ({ context, errors }) => {
    try {
      return await context.services.github.listRepos(context.user.id)
    } catch (error) {
      if (error instanceof GithubTokenRejectedError) throw errors.GITHUB_RELINK_REQUIRED()
      throw error
    }
  }),
}
