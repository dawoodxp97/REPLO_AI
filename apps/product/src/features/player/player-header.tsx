import { Button } from '@replo/ui'
import { ArrowLeft, Code, ListTree, Search } from 'lucide-react'
import { LinkButton } from '@/components/link-button'

export interface PlayerHeaderProps {
  title: string
  overviewHref: string
  sourceHref: string
  onOpenOutline: (() => void) | null
  onOpenCommands: () => void
}

export function PlayerHeader({
  title,
  overviewHref,
  sourceHref,
  onOpenOutline,
  onOpenCommands,
}: PlayerHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenOutline ? (
          <Button variant="outline" size="sm" onClick={onOpenOutline}>
            <ListTree />
            Lessons
          </Button>
        ) : null}
        <LinkButton href={overviewHref} variant="ghost" size="sm" className="min-w-0 max-w-full">
          <ArrowLeft />
          <span className="truncate">{title}</span>
        </LinkButton>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenCommands}>
          <Search />
          Commands
        </Button>
        <LinkButton href={sourceHref} variant="ghost" size="sm">
          <Code />
          Source explorer
        </LinkButton>
      </div>
    </header>
  )
}
