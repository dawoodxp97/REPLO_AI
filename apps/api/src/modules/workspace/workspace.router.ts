import { ORPCError } from '@orpc/server'
import { authed } from '../../orpc'

export const workspaceRouter = {
  graph: authed.workspace.graph.handler(({ input, context }) =>
    context.services.workspace.graph(context.user.id, input),
  ),
  node: authed.workspace.node.handler(({ input, context }) =>
    context.services.workspace.node(context.user.id, input),
  ),
  diagram: authed.workspace.diagram.handler(async ({ input, context, errors }) => {
    try {
      return await context.services.workspace.diagram(context.user.id, input)
    } catch (error) {
      if (error instanceof ORPCError && error.code === 'NOT_FOUND') throw errors.DIAGRAM_NOT_FOUND()
      throw error
    }
  }),
  tree: authed.workspace.tree.handler(({ input, context }) =>
    context.services.workspace.tree(context.user.id, input),
  ),
}