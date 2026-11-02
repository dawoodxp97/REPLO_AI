import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function RadioGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div role="radiogroup" className={cn('grid gap-3', className)} {...props} />
}

export function RadioGroupItem({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="radio"
      className={cn(
        'size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-card shadow-xs transition-[border-width,border-color] outline-none checked:border-[5px] checked:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
