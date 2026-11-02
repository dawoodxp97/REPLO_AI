import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const alertVariants = cva(
  'relative grid w-full grid-cols-[minmax(0,1fr)] items-start gap-y-1 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_minmax(0,1fr)] has-[>svg]:gap-x-3 has-[>svg]:[&>:not(svg)]:col-start-2 [&>svg]:row-span-2 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'border-destructive/30 bg-destructive/5 text-destructive [&>[data-slot=alert-description]]:text-destructive/90',
        interpretation:
          'border-interpretation/40 bg-interpretation/8 [&>svg]:text-interpretation-text',
        observed: 'border-observed/30 bg-observed/6 [&>svg]:text-observed-text',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant }), className)} {...props} />
}

export function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-h-4 font-medium tracking-tight', className)} {...props} />
}

export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}
