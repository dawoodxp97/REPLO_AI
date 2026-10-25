'use client'

import {
  Alert,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@replo/ui'
import type { ReactNode } from 'react'
import { useState } from 'react'

export interface ConfirmDialogProps {
  triggerLabel: string
  title: string
  description: string
  confirmLabel: string
  run: () => Promise<unknown>
  describeError: (error: unknown) => string
  confirmDisabled?: boolean
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
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await run()
      setOpen(false)
    } catch (caught) {
      setError(describeError(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {children}
        {error ? (
          <Alert tone="destructive" role="alert">
            {error}
          </Alert>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            disabled={pending || confirmDisabled}
            onClick={() => void confirm()}
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
