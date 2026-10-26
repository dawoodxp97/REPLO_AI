'use client'

import { Alert, Button } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { orpc } from '@/lib/orpc'
import { authNotice } from './auth-notices'
import { PROVIDER_LABELS, providerStartUrl } from './sign-in-links'
import { SignInForm, SignUpForm } from './password-forms'

type Mode = 'sign-in' | 'sign-up'

export function LoginPanel({ error }: { error?: string }) {
  const providers = useQuery(orpc.auth.providers.queryOptions())
  const [mode, setMode] = useState<Mode>('sign-in')
  const notice = authNotice(error)
  const enabled = providers.data
    ? (['github', 'google'] as const).filter((provider) => providers.data[provider])
    : []

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert tone="destructive" role="alert">
          {notice}
        </Alert>
      ) : null}

      {enabled.length > 0 ? (
        <div className="space-y-3">
          {enabled.map((provider) => (
            <Button
              key={provider}
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => window.location.assign(providerStartUrl(provider))}
            >
              Continue with {PROVIDER_LABELS[provider]}
            </Button>
          ))}
          <p className="text-center text-xs text-muted-foreground">or use your email</p>
        </div>
      ) : null}

      <div role="group" aria-label="Email sign-in" className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === 'sign-in' ? 'primary' : 'outline'}
          aria-pressed={mode === 'sign-in'}
          onClick={() => setMode('sign-in')}
        >
          Sign in
        </Button>
        <Button
          variant={mode === 'sign-up' ? 'primary' : 'outline'}
          aria-pressed={mode === 'sign-up'}
          onClick={() => setMode('sign-up')}
        >
          Create account
        </Button>
      </div>

      {mode === 'sign-in' ? <SignInForm /> : <SignUpForm />}
    </div>
  )
}
