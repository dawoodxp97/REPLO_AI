import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function ItemGroup({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'flex flex-col divide-y overflow-hidden rounded-lg border bg-card shadow-xs',
        className,
      )}
      {...props}
    />
  )
}

const itemVariants = cva('flex flex-wrap items-center gap-x-4 gap-y-2 text-sm', {
  variants: {
    size: {
      default: 'px-4 py-3.5',
      sm: 'px-3 py-2.5',
    },
  },
  defaultVariants: { size: 'default' },
})

export function Item({
  className,
  size,
  ...props
}: ComponentProps<'li'> & VariantProps<typeof itemVariants>) {
  return <li className={cn(itemVariants({ size }), className)} {...props} />
}

export function ItemMedia({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export function ItemContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex min-w-0 flex-1 flex-col gap-1', className)} {...props} />
}

export function ItemTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2 leading-snug font-medium', className)}
      {...props}
    />
  )
}

export function ItemDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('line-clamp-2 text-compact leading-normal text-muted-foreground', className)}
      {...props}
    />
  )
}

export function ItemActions({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex shrink-0 items-center gap-2', className)} {...props} />
}
