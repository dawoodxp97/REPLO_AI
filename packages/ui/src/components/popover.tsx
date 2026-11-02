import { Popover as BasePopover } from '@base-ui/react/popover'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { floatingPanelClass } from '../lib/overlay'
import type { BaseProps } from '../lib/types'

export const Popover = BasePopover.Root
export const PopoverTrigger = BasePopover.Trigger
export const PopoverClose = BasePopover.Close

type PositionerProps = ComponentProps<typeof BasePopover.Positioner>

export function PopoverContent({
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  children,
  ...props
}: BaseProps<typeof BasePopover.Popup> & {
  align?: PositionerProps['align']
  side?: PositionerProps['side']
  sideOffset?: number
}) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50">
        <BasePopover.Popup
          className={cn(floatingPanelClass, 'w-[min(22rem,calc(100vw-2rem))] p-2', className)}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}
