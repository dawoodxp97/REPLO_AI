import { useRouter } from 'next/navigation'
import { useMarkLesson, useUnmarkLesson } from '@/features/progress/use-progress'

export interface LessonCompletionInput {
  versionId: string
  lessonKey: string
  completed: boolean
  advanceTo: string | null
}

export function useLessonCompletion({
  versionId,
  lessonKey,
  completed,
  advanceTo,
}: LessonCompletionInput): { toggle: () => void; pending: boolean } {
  const router = useRouter()
  const markLesson = useMarkLesson()
  const unmarkLesson = useUnmarkLesson()
  const pending = markLesson.isPending || unmarkLesson.isPending

  function toggle() {
    if (pending) return
    if (completed) {
      unmarkLesson.mutate({ versionId, lessonKey })
      return
    }
    markLesson.mutate(
      { versionId, lessonKey, status: 'completed' },
      {
        onSuccess: () => {
          if (advanceTo) router.push(advanceTo)
        },
      },
    )
  }

  return { toggle, pending }
}
