import { cn } from '@replo/ui'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function TitledSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <SectionHeader id={id} title={title} description={description} />
      {children}
    </section>
  )
}
