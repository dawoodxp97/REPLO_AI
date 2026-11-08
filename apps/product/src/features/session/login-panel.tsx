'use client'

import { OAUTH_PROVIDERS } from '@replo/contracts'
import { Button, Separator, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { InlineError } from '@/components/inline-error'
import { orpc } from '@/lib/orpc'
import { authNotice } from './auth-notices'
import { SignInForm, SignUpForm } from './password-forms'
import { ProviderLinkButton } from './provider-link-button'
import { OAUTH_PROVIDER_LABELS } from './sign-in-links'

export function LoginPanel({ error }: { error?: string }) {
  const notice = authNotice(error)
  const providers = useQuery(orpc.auth.providers.queryOptions())
  const enabledProviders = OAUTH_PROVIDERS.filter((provider) => providers.data?.[provider])

  return (
    <div className="flex flex-col gap-6">
      {notice ? <InlineError>{notice}</InlineError> : null}

      {providers.isPending ? (
        <Skeleton aria-label="Loading sign-in methods" className="h-11 w-full" />
      ) : null}
      {providers.isError ? (
        <div className="text-sm text-muted-foreground">
          <p>Other sign-in methods could not be loaded. You can still use email.</p>
          <Button variant="ghost" size="sm" onClick={() => void providers.refetch()}>
            Retry sign-in methods
          </Button>
        </div>
      ) : null}
      {enabledProviders.length > 0 ? (
        <>
          <div className="grid gap-2.5">
            {enabledProviders.map((provider) => (
              <ProviderLinkButton key={provider} provider={provider} variant="outline" size="lg">
                Continue with {OAUTH_PROVIDER_LABELS[provider]}
              </ProviderLinkButton>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or use email
            <Separator className="flex-1" />
          </div>
        </>
      ) : null}

      <Tabs defaultValue="sign-in">
        <TabsList className="w-full">
          <TabsTrigger value="sign-in" className="flex-1">
            Sign in
          </TabsTrigger>
          <TabsTrigger value="sign-up" className="flex-1">
            Create account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sign-in">
          <SignInForm />
        </TabsContent>
        <TabsContent value="sign-up">
          <SignUpForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
