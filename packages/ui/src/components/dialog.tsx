import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { backdropClass } from '../lib/overlay'
import type { BaseProps } from '../lib/types'

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogClose = BaseDialog.Close

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: BaseProps<typeof BaseDialog.Popup> & { showCloseButton?: boolean }) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={backdropClass} />
      <BaseDialog.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-6 text-popover-foreground shadow-xl shadow-black/10 outline-none transition-[opacity,scale] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <BaseDialog.Close
            aria-label="Close"
            className="absolute top-4 right-4 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 pr-8', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: BaseProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={cn('text-base leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: BaseProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}
