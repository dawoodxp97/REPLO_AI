import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

export function Progress({ className, ...props }: ComponentProps<'progress'>) {
  return (
    <progress
      max={100}
      className={cn(
        'h-1.5 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width]',
        className,
      )}
      {...props}
    />
  )
}
