import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Empty({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-5 rounded-lg border border-dashed p-8 text-center text-balance md:p-12',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex max-w-sm flex-col items-center gap-2', className)} {...props} />
}

export function EmptyMedia({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        "mb-1 flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  )
}

export function EmptyTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold tracking-tight', className)} {...props} />
}

export function EmptyDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm/relaxed text-muted-foreground [&>a]:text-link [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  )
}

export function EmptyContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-sm', className)}
      {...props}
    />
  )
}
