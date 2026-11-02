import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { controlClass } from '../lib/control'

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(controlClass, 'field-sizing-content min-h-20 px-3 py-2', className)}
      {...props}
    />
  )
}
