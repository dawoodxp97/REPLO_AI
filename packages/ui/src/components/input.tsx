import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import { controlClass } from '../lib/control'

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        controlClass,
        'h-9 px-3 py-1 pointer-coarse:h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
}
