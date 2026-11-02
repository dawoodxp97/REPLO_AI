import { Avatar as BaseAvatar } from '@base-ui/react/avatar'
import { cn } from '../lib/cn'
import type { BaseProps } from '../lib/types'

export function Avatar({ className, ...props }: BaseProps<typeof BaseAvatar.Root>) {
  return (
    <BaseAvatar.Root
      className={cn(
        'relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted align-middle text-xs font-medium text-muted-foreground select-none',
        className,
      )}
      {...props}
    />
  )
}

export function AvatarImage({ className, ...props }: BaseProps<typeof BaseAvatar.Image>) {
  return <BaseAvatar.Image className={cn('size-full object-cover', className)} {...props} />
}

export function AvatarFallback({ className, ...props }: BaseProps<typeof BaseAvatar.Fallback>) {
  return (
    <BaseAvatar.Fallback
      className={cn('flex size-full items-center justify-center uppercase', className)}
      {...props}
    />
  )
}
