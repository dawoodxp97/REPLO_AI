'use client'

import { OAUTH_PROVIDERS, type SignInMethodsDto } from '@replo/contracts'
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@replo/ui'
import { Check, KeyRound } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { InlineError } from '@/components/inline-error'
import { authNotice } from '@/features/session/auth-notices'
import { ProviderIcon } from '@/features/session/provider-icons'
import { ProviderLinkButton } from '@/features/session/provider-link-button'
import { OAUTH_PROVIDER_LABELS } from '@/features/session/sign-in-links'

function ConnectedBadge() {
  return (
    <Badge variant="observed">
      <Check />
      Connected
    </Badge>
  )
}

export function SignInMethodsCard({ methods }: { methods: SignInMethodsDto }) {
  const params = useSearchParams()
  const notice = authNotice(params.get('error') ?? undefined)
  const linked = OAUTH_PROVIDERS.find((provider) => provider === params.get('linked'))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-in methods</CardTitle>
        <CardDescription>Connect GitHub to import private repositories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice ? <InlineError>{notice}</InlineError> : null}
        {linked && !notice ? (
          <Alert variant="observed" role="status">
            <Check />
            <AlertDescription>{`${OAUTH_PROVIDER_LABELS[linked]} is connected.`}</AlertDescription>
          </Alert>
        ) : null}
        <ItemGroup>
          <Item>
            <ItemMedia>
              <KeyRound aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Email and password</ItemTitle>
            </ItemContent>
            <ItemActions>
              {methods.password ? <ConnectedBadge /> : <Badge variant="outline">Not set</Badge>}
            </ItemActions>
          </Item>
          {OAUTH_PROVIDERS.map((provider) => (
            <Item key={provider}>
              <ItemMedia>
                <ProviderIcon provider={provider} className="size-4" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{OAUTH_PROVIDER_LABELS[provider]}</ItemTitle>
              </ItemContent>
              <ItemActions>
                {methods[provider] ? (
                  <ConnectedBadge />
                ) : (
                  <ProviderLinkButton provider={provider} intent="link" variant="outline" size="sm">
                    Connect {OAUTH_PROVIDER_LABELS[provider]}
                  </ProviderLinkButton>
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}
