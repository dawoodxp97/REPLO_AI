import { authed } from '../../orpc'

export const githubRouter = {
  installUrl: authed.github.installUrl.handler(({ context }) => {
    const url = context.services.github.installUrl()
    return { url }
  }),
  listRepos: authed.github.listRepos.handler(({ context }) =>
    context.services.github.listRepos(context.user.id),
  ),
}
