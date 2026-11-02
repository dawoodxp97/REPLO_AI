import { cn } from '@replo/ui'
import type { ReactNode } from 'react'

export interface DescriptionItemProps {
  label: string
  children: ReactNode
  emphasis?: boolean
  className?: string
}

export function DescriptionItem({ label, children, emphasis, className }: DescriptionItemProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm break-words', emphasis && 'font-medium', className)}>
        {children}
      </dd>
    </div>
  )
}
