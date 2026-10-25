import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogClose = BaseDialog.Close

export function DialogContent({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof BaseDialog.Popup>, 'className'> & { className?: string }) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 bg-foreground/40" />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}

export function DialogTitle({
  className,
  ...props
}: Omit<ComponentProps<typeof BaseDialog.Title>, 'className'> & { className?: string }) {
  return <BaseDialog.Title className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: Omit<ComponentProps<typeof BaseDialog.Description>, 'className'> & { className?: string }) {
  return (
    <BaseDialog.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}
