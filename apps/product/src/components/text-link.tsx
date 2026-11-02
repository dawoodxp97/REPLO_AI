import { cn } from '@replo/ui'
import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes } from 'react'

export type TextLinkProps = LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>

export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <Link
      className={cn('text-link underline underline-offset-4 hover:opacity-80', className)}
      {...props}
    />
  )
}
