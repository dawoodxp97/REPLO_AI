import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group'
import { cn } from '../lib/cn'
import type { BaseProps } from '../lib/types'

export function ToggleGroup({ className, ...props }: BaseProps<typeof BaseToggleGroup>) {
  return (
    <BaseToggleGroup
      className={cn('inline-flex w-full items-center gap-1 rounded-lg bg-muted p-1', className)}
      {...props}
    />
  )
}

export function ToggleGroupItem({ className, ...props }: BaseProps<typeof BaseToggle>) {
  return (
    <BaseToggle
      className={cn(
        "inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[pressed]:bg-card data-[pressed]:text-foreground data-[pressed]:shadow-xs pointer-coarse:h-10 pointer-coarse:min-w-10 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}
