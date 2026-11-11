import { LinkButton } from '@/components/link-button'
import { importPath, NEW_TUTORIAL_LABEL } from '@/lib/import-path'

export function NewTutorialAction() {
  return (
    <LinkButton href={importPath()} className="md:hidden">
      {NEW_TUTORIAL_LABEL}
    </LinkButton>
  )
}
