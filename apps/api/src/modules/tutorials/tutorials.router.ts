import { authed, os } from '../../orpc'
import type { RequestContext } from '../../context'

const viewerOf = (context: RequestContext, shareToken?: string) => ({
  userId: context.user?.id,
  shareToken,
})

export const tutorialsRouter = {
  list: authed.tutorials.list.handler(({ input, context }) =>
    context.services.tutorialLibrary.list(context.user.id, input),
  ),
  get: os.tutorials.get.handler(({ input, context }) =>
    context.services.tutorialLibrary.overview(viewerOf(context, input.shareToken), input),
  ),
  getChapter: os.tutorials.getChapter.handler(({ input, context }) =>
    context.services.tutorialLibrary.chapter(viewerOf(context, input.shareToken), input),
  ),
  getSource: os.tutorials.getSource.handler(({ input, context }) =>
    context.services.tutorialLibrary.source(viewerOf(context, input.shareToken), input),
  ),
  sourceTree: os.tutorials.sourceTree.handler(({ input, context }) =>
    context.services.tutorialLibrary.sourceTree(viewerOf(context, input.shareToken), input),
  ),
  setVisibility: authed.tutorials.setVisibility.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.tutorialManager.setVisibility(context.user.id, input)
    if (outcome.kind === 'refused') throw errors.PUBLIC_REQUIRES_OPEN_LICENSE()
    return outcome.value
  }),
  createShareLink: authed.tutorials.createShareLink.handler(({ input, context }) =>
    context.services.tutorialManager.createShareLink(context.user.id, input.tutorialId),
  ),
  delete: authed.tutorials.delete.handler(async ({ input, context }) => {
    await context.services.tutorialManager.deleteTutorial(context.user.id, input.tutorialId)
    return { ok: true as const }
  }),
  report: authed.tutorials.report.handler(async ({ input, context }) => {
    await context.services.tutorialManager.report(context.user.id, input.tutorialId, input.reason)
    return { ok: true as const }
  }),
}
