import type { Metadata } from 'next'
import { ProgressPage } from '@/features/progress/progress-page'
import { CourseShell } from '@/features/courses/course-shell'
import type { CourseRef } from '@/lib/course-paths'

export const metadata: Metadata = { title: 'Your progress' }

export default async function ProgressRoute({ params }: { params: Promise<CourseRef> }) {
  return (
    <CourseShell>
      <ProgressPage course={await params} />
    </CourseShell>
  )
}
