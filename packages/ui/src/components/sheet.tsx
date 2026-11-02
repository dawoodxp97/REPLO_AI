import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { backdropClass } from '../lib/overlay'
import type { BaseProps } from '../lib/types'

export const Sheet = BaseDialog.Root
export const SheetTrigger = BaseDialog.Trigger
export const SheetClose = BaseDialog.Close

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 overflow-y-auto bg-popover text-popover-foreground shadow-xl outline-none transition-transform duration-200 ease-out',
  {
    variants: {
      side: {
        left: 'inset-y-0 left-0 h-dvh w-[min(20rem,85vw)] border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full',
        right:
          'inset-y-0 right-0 h-dvh w-[min(24rem,90vw)] border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full',
        bottom:
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export function SheetContent({
  className,
  side,
  children,
  ...props
}: BaseProps<typeof BaseDialog.Popup> & VariantProps<typeof sheetVariants>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={backdropClass} />
      <BaseDialog.Popup className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <BaseDialog.Close
          aria-label="Close"
          className="absolute top-3.5 right-3.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-4 pr-12', className)} {...props} />
}

export function SheetTitle({ className, ...props }: BaseProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title className={cn('text-base font-semibold', className)} {...props} />
}

export function SheetDescription({
  className,
  ...props
}: BaseProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}
