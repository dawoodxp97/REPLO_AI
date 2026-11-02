import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function MonoLabel({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('font-mono text-meta tracking-wide text-muted-foreground', className)}
      {...props}
    />
  )
}
