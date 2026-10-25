import { authed } from '../../orpc'

export const learningRouter = {
  getProgress: authed.learning.getProgress.handler(({ input, context }) =>
    context.services.learning.progress(context.user.id, input),
  ),
  history: authed.learning.history.handler(({ input, context }) =>
    context.services.learning.history(context.user.id, input),
  ),
  markLesson: authed.learning.markLesson.handler(({ input, context }) =>
    context.services.learning.markLesson(context.user.id, input),
  ),
  unmarkLesson: authed.learning.unmarkLesson.handler(({ input, context }) =>
    context.services.learning.unmarkLesson(context.user.id, input),
  ),
  submitQuiz: authed.learning.submitQuiz.handler(({ input, context }) =>
    context.services.learning.submitQuiz(context.user.id, input),
  ),
}
