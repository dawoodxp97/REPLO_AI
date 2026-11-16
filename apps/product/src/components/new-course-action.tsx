import { LinkButton } from '@/components/link-button'
import { importPath, NEW_COURSE_LABEL } from '@/lib/import-path'

export function NewCourseAction() {
  return (
    <LinkButton href={importPath()} className="md:hidden">
      {NEW_COURSE_LABEL}
    </LinkButton>
  )
}
