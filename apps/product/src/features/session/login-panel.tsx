'use client'

import {
  Alert,
  AlertDescription,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import { authNotice } from './auth-notices'
import { SignInForm, SignUpForm } from './password-forms'
import { ProviderLinkButton } from './provider-link-button'
import { OAUTH_PROVIDERS, PROVIDER_LABELS } from './sign-in-links'

export function LoginPanel({ error }: { error?: string }) {
  const notice = authNotice(error)

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2.5">
        {OAUTH_PROVIDERS.map((provider) => (
          <ProviderLinkButton key={provider} provider={provider} variant="outline" size="lg">
            Continue with {PROVIDER_LABELS[provider]}
          </ProviderLinkButton>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or use email
        <Separator className="flex-1" />
      </div>

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
