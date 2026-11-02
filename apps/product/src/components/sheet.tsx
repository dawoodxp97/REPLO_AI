'use client'

import {
  Sheet as SheetRoot,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@replo/ui'
import type { ReactNode } from 'react'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: 'bottom' | 'left' | 'right'
  title: string
  description?: string
  children: ReactNode
}

export function Sheet({ open, onOpenChange, side, title, description, children }: SheetProps) {
  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="gap-0">
        <SheetHeader className="border-b">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </SheetRoot>
  )
}
