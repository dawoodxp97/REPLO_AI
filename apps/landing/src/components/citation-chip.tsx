import { cn } from '@replo/ui'
import Link from 'next/link'

const chipClass =
  'inline-flex max-w-full items-center gap-1.5 rounded-sm border bg-card px-1.5 py-0.5 align-middle font-sans transition-colors'

function ChipBody({ children }: { children: string }) {
  return (
    <>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-observed" />
      <span className="truncate font-mono text-meta leading-4 text-foreground">{children}</span>
    </>
  )
}

export function CitationChip({ children }: { children: string }) {
  return (
    <span className={chipClass}>
      <ChipBody>{children}</ChipBody>
    </span>
  )
}

export function CitationLink({
  href,
  label,
  active,
  children,
}: {
  href: string
  label: string
  active?: boolean
  children: string
}) {
  const Anchor = href.startsWith('#') ? 'a' : Link
  return (
    <Anchor
      href={href}
      aria-label={label}
      className={cn(chipClass, 'hover:bg-accent', active && 'border-observed/45')}
    >
      <ChipBody>{children}</ChipBody>
    </Anchor>
  )
}
