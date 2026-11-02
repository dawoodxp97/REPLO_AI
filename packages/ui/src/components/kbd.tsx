import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm border bg-muted px-1 font-mono text-meta font-medium text-muted-foreground select-none',
        className,
      )}
      {...props}
    />
  )
}
