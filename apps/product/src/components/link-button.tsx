import { buttonVariants, cn, type ButtonVariantProps } from '@replo/ui'
import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes } from 'react'

export type LinkButtonProps = LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> &
  ButtonVariantProps & { className?: string }

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
