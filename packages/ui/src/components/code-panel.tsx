import type { ComponentProps, ElementType } from 'react'
import { cn } from '../lib/cn'

type CodePanelProps = Omit<ComponentProps<'div'>, 'ref'> & {
  as?: 'div' | 'pre' | 'ul'
  embedded?: boolean
}

export function CodePanel({ as = 'div', embedded = false, className, ...props }: CodePanelProps) {
  const Tag = as as ElementType
  return (
    <Tag
      className={cn(
        'scrollbar-thin bg-code-bg font-mono text-compact leading-6',
        !embedded && 'rounded-lg border',
        className,
      )}
      {...props}
    />
  )
}

export function CodePanelHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex h-10 items-center justify-between gap-3 border-b px-4', className)}
      {...props}
    />
  )
}
