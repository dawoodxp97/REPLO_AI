'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@replo/ui'
import type { ReactNode } from 'react'

type SheetSide = 'bottom' | 'left'

const SIDE_CLASSES: Record<SheetSide, string> = {
  bottom:
    'top-auto right-0 bottom-0 left-0 max-h-[80dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-lg rounded-b-none',
  left: 'top-0 bottom-0 left-0 h-dvh w-[min(20rem,85vw)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none',
}

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: SheetSide
  title: string
  description?: string
  children: ReactNode
}

export function Sheet({ open, onOpenChange, side, title, description, children }: SheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={SIDE_CLASSES[side]}>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
        {children}
      </DialogContent>
    </Dialog>
  )
}
