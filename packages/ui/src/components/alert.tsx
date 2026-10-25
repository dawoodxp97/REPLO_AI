import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const alertVariants = cva('rounded-md border px-3 py-2 text-sm', {
  variants: {
    tone: {
      neutral: 'border-border bg-muted text-foreground',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      interpretation: 'border-interpretation/40 bg-interpretation/15 text-foreground',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>

export function Alert({ className, tone, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ tone }), className)} {...props} />
}
