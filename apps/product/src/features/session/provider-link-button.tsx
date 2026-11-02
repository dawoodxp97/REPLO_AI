import type { OAuthProvider } from '@replo/contracts'
import type { ReactNode } from 'react'
import { LinkButton, type LinkButtonProps } from '@/components/link-button'
import { ProviderIcon } from './provider-icons'
import { providerStartUrl } from './sign-in-links'

export interface ProviderLinkButtonProps extends Pick<
  LinkButtonProps,
  'variant' | 'size' | 'className'
> {
  provider: OAuthProvider
  intent?: 'link'
  children: ReactNode
}

export function ProviderLinkButton({
  provider,
  intent,
  children,
  ...buttonProps
}: ProviderLinkButtonProps) {
  return (
    <LinkButton href={providerStartUrl(provider, intent)} prefetch={false} {...buttonProps}>
      <ProviderIcon provider={provider} />
      {children}
    </LinkButton>
  )
}
