import type { ComponentType, ReactNode } from 'react'
import { cn } from '../lib/cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-6 shrink-0', className)}>
      <rect x="1" y="1" width="22" height="22" rx="5" className="fill-foreground" />
      <path d="M8 5v14" strokeWidth="1.5" className="stroke-background" />
      <path
        d="M11 8h7M11 12h5M11 16h3"
        strokeWidth="2"
        strokeLinecap="round"
        className="stroke-background"
      />
      <circle cx="18" cy="16" r="2" className="fill-observed" />
    </svg>
  )
}

type BrandLinkProps = {
  href: string
  className?: string
  'aria-label'?: string
  children: ReactNode
}

export function Brand({
  href = '/',
  linkComponent: LinkComponent = 'a',
  className,
}: {
  href?: string
  linkComponent?: ComponentType<BrandLinkProps> | 'a'
  className?: string
}) {
  return (
    <LinkComponent
      href={href}
      aria-label="Replo home"
      className={cn('inline-flex items-center gap-2 rounded-sm pointer-coarse:min-h-10', className)}
    >
      <BrandMark />
      <span className="text-brand font-semibold tracking-display">Replo</span>
    </LinkComponent>
  )
}
