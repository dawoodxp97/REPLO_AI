import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Checkbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <span className="relative inline-flex size-4 shrink-0">
      <input
        type="checkbox"
        className={cn(
          'peer size-4 cursor-pointer appearance-none rounded-[4px] border border-input bg-card shadow-xs transition-colors outline-none checked:border-primary checked:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
      />
    </span>
  )
}
