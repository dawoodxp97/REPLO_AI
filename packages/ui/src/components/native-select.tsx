import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { controlClass } from '../lib/control'

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          controlClass,
          'h-9 cursor-pointer appearance-none pr-9 pl-3 pointer-coarse:h-10',
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
