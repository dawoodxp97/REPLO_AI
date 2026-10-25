import { Popover as BasePopover } from '@base-ui/react/popover'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const Popover = BasePopover.Root
export const PopoverTrigger = BasePopover.Trigger
export const PopoverClose = BasePopover.Close

export function PopoverContent({
  className,
  align = 'end',
  sideOffset = 8,
  children,
  ...props
}: Omit<ComponentProps<typeof BasePopover.Popup>, 'className'> & {
  className?: string
  align?: ComponentProps<typeof BasePopover.Positioner>['align']
  sideOffset?: number
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <BasePopover.Popup
          className={cn(
            'w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg outline-none',
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}
