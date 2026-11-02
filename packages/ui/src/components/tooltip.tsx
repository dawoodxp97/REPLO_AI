import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import type { BaseProps } from '../lib/types'

export const TooltipProvider = BaseTooltip.Provider
export const Tooltip = BaseTooltip.Root
export const TooltipTrigger = BaseTooltip.Trigger

type PositionerProps = ComponentProps<typeof BaseTooltip.Positioner>

export function TooltipContent({
  className,
  side = 'top',
  sideOffset = 6,
  ...props
}: BaseProps<typeof BaseTooltip.Popup> & {
  side?: PositionerProps['side']
  sideOffset?: number
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          className={cn(
            'origin-[var(--transform-origin)] rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-[opacity,scale] duration-100 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
}
