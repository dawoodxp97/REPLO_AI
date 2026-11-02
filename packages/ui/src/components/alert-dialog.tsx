import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import { cn } from '../lib/cn'
import { backdropClass } from '../lib/overlay'
import type { BaseProps } from '../lib/types'

export const AlertDialog = BaseAlertDialog.Root
export const AlertDialogTrigger = BaseAlertDialog.Trigger
export const AlertDialogClose = BaseAlertDialog.Close

export function AlertDialogContent({
  className,
  ...props
}: BaseProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className={backdropClass} />
      <BaseAlertDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl shadow-black/10 outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
          className,
        )}
        {...props}
      />
    </BaseAlertDialog.Portal>
  )
}

export function AlertDialogTitle({ className, ...props }: BaseProps<typeof BaseAlertDialog.Title>) {
  return (
    <BaseAlertDialog.Title
      className={cn('text-base leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

export function AlertDialogDescription({
  className,
  ...props
}: BaseProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
