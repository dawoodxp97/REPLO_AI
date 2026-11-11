'use client'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  type ButtonVariantProps,
} from '@replo/ui'
import { useState, type ReactNode } from 'react'
import { InlineError } from './inline-error'

export interface ConfirmDialogProps {
  triggerLabel: string
  title: string
  description: ReactNode
  confirmLabel: string
  run: () => Promise<unknown>
  describeError: (error: unknown) => string
  confirmDisabled?: boolean
  triggerVariant?: ButtonVariantProps['variant']
  triggerSize?: ButtonVariantProps['size']
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  run,
  describeError,
  confirmDisabled = false,
  triggerVariant = 'destructive-outline',
  triggerSize = 'sm',
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeOpen(next: boolean) {
    if (next) setError(null)
    setOpen(next)
    onOpenChange?.(next)
  }

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await run()
      changeOpen(false)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="space-y-1.5">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </div>
        {children}
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
          <Button
            variant="destructive"
            disabled={pending || confirmDisabled}
            onClick={() => void confirm()}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
