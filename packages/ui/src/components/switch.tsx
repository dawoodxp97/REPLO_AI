import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Switch({ className, ...props }: Omit<ComponentProps<'input'>, 'type' | 'role'>) {
  return (
    <span className="relative inline-flex h-5 w-9 shrink-0">
      <input
        type="checkbox"
        role="switch"
        className={cn(
          'peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-input transition-colors outline-none checked:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-4"
      />
    </span>
  )
}
