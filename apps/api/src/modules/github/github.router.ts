import { authed } from '../../orpc'

export const githubRouter = {
  installUrl: authed.github.installUrl.handler(({ context }) => ({
    url: context.services.github.installUrl(),
  })),
  listRepos: authed.github.listRepos.handler(({ context }) =>
    context.services.github.listRepos(context.user.id),
  ),
}
