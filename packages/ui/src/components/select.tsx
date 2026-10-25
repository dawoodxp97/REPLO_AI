import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50 aria-[invalid=true]:border-destructive',
        className,
      )}
      {...props}
    />
  )
}
