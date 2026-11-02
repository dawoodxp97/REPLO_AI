import { Menu } from '@base-ui/react/menu'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { floatingPanelClass } from '../lib/overlay'
import type { BaseProps } from '../lib/types'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group
export const DropdownMenuRadioGroup = Menu.RadioGroup

type PositionerProps = ComponentProps<typeof Menu.Positioner>

export function DropdownMenuContent({
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  ...props
}: BaseProps<typeof Menu.Popup> & {
  align?: PositionerProps['align']
  side?: PositionerProps['side']
  sideOffset?: number
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} side={side} sideOffset={sideOffset} className="z-50">
        <Menu.Popup className={cn(floatingPanelClass, 'min-w-48 p-1', className)} {...props} />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

const itemClass =
  "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

export function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: BaseProps<typeof Menu.Item> & { variant?: 'default' | 'destructive' }) {
  return (
    <Menu.Item
      className={cn(
        itemClass,
        variant === 'destructive' &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg:not([class*=text-])]:text-destructive',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLinkItem({ className, ...props }: BaseProps<typeof Menu.LinkItem>) {
  return <Menu.LinkItem className={cn(itemClass, className)} {...props} />
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: BaseProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClass, 'pr-8', className)} {...props}>
      {children}
      <Menu.RadioItemIndicator className="absolute right-2 inline-flex">
        <Check className="size-4 text-foreground" />
      </Menu.RadioItemIndicator>
    </Menu.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }: BaseProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
