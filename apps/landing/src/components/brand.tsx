import { cn } from '@replo/ui'
import Link from 'next/link'

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

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Replo home"
      className={cn('inline-flex items-center gap-2 rounded-sm', className)}
    >
      <BrandMark />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">Replo</span>
    </Link>
  )
}
