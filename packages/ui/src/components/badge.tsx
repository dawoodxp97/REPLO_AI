import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-muted-foreground',
        observed: 'border-observed/25 bg-observed/10 text-observed-text',
        interpretation: 'border-interpretation/35 bg-interpretation/12 text-interpretation-text',
        destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
)

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
