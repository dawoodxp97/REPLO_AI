import { useRouter } from 'next/navigation'
import type { PaletteItem } from './palette-items'
import { LESSON_SHORTCUTS } from './shortcuts'
import type { TutorialLinks } from '@/lib/tutorial-paths'
import type { LessonNavigation } from './use-lesson-navigation'

export interface LessonCommandsInput {
  navigation: LessonNavigation
  links: TutorialLinks
  completed: boolean
  onToggleComplete: () => void
}

export function useLessonCommands({
  navigation,
  links,
  completed,
  onToggleComplete,
}: LessonCommandsInput): PaletteItem[] {
  const router = useRouter()

  const lessonItems: PaletteItem[] = navigation.sequence.map((position) => ({
    id: `lesson:${position.lessonKey}`,
    label: `Go to ${position.lessonTitle}`,
    group: 'Lessons',
    run: () => navigation.goTo(position),
  }))

  return [
    ...lessonItems,
    ...(navigation.next
      ? [
          {
            id: 'next-lesson',
            label: 'Next lesson',
            group: 'Actions',
            shortcut: LESSON_SHORTCUTS.next.keys,
            run: navigation.goNext,
          },
        ]
      : []),
    ...(navigation.previous
      ? [
          {
            id: 'previous-lesson',
            label: 'Previous lesson',
            group: 'Actions',
            shortcut: LESSON_SHORTCUTS.previous.keys,
            run: navigation.goPrevious,
          },
        ]
      : []),
    {
      id: 'toggle-complete',
      label: completed ? 'Mark lesson as not complete' : 'Mark lesson complete',
      group: 'Actions',
      shortcut: LESSON_SHORTCUTS.toggleComplete.keys,
      run: onToggleComplete,
    },
    {
      id: 'source-explorer',
      label: 'Open the source explorer',
      group: 'Actions',
      run: () => router.push(links.sourceExplorer()),
    },
  ]
}
