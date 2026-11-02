import { cn } from '@replo/ui'
import Link from 'next/link'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('size-6 shrink-0 text-foreground', className)}
      fill="none"
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" className="fill-foreground" />
      <path d="M8 6v12" className="stroke-background" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M11 8h6M11 12h4M11 16h5"
        className="stroke-background"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="17.5" cy="12" r="1.6" className="fill-observed" />
    </svg>
  )
}

export function Brand({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-md text-[0.9375rem] font-semibold tracking-tight',
        className,
      )}
    >
      <BrandMark />
      Replo
    </Link>
  )
}
