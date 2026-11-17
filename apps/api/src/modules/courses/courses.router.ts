import { OK_RESULT } from '@replo/contracts'
import { authed, os } from '../../orpc'
import type { RequestContext } from '../../request-context'

const viewerOf = (context: RequestContext) => ({ userId: context.user?.id })

export const coursesRouter = {
  list: authed.courses.list.handler(({ input, context }) =>
    context.services.courseCatalog.list(context.user.id, input),
  ),
  get: os.courses.get.handler(({ input, context }) =>
    context.services.courseContent.overview(viewerOf(context), input),
  ),
  getChapter: os.courses.getChapter.handler(({ input, context }) =>
    context.services.courseContent.chapter(viewerOf(context), input),
  ),
  getSource: os.courses.getSource.handler(({ input, context }) =>
    context.services.courseContent.source(viewerOf(context), input),
  ),
  delete: authed.courses.delete.handler(async ({ input, context }) => {
    await context.services.courseManager.deleteCourse(context.user.id, input.courseId)
    return OK_RESULT
  }),
}