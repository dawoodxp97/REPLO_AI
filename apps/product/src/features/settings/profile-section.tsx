'use client'

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Skeleton,
} from '@replo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ErrorPanel } from '@/components/error-panel'
import { authNotice } from '@/features/session/auth-notices'
import { PROVIDER_LABELS, providerStartUrl } from '@/features/session/sign-in-links'
import { apiErrorDetails } from '@/lib/api-error'
import { orpc } from '@/lib/orpc'

type PublicTutorials = 'delete' | 'anonymise'

const LINKABLE_PROVIDERS = ['github', 'google'] as const

export function ProfileSection() {
  const me = useQuery(orpc.me.get.queryOptions())
  const deleteAccount = useMutation(orpc.me.deleteAccount.mutationOptions())
  const signOut = useMutation(orpc.auth.signOut.mutationOptions())
  const revokeOtherSessions = useMutation(orpc.auth.revokeOtherSessions.mutationOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const params = useSearchParams()
  const [sessionNote, setSessionNote] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [publicTutorials, setPublicTutorials] = useState<PublicTutorials>('delete')

  if (me.isPending) return <Skeleton aria-busy="true" className="h-48 w-full" />
  if (me.isError || !me.data) {
    return (
      <ErrorPanel
        title="We could not load your profile"
        description="Check your connection, then reload."
      />
    )
  }

  const { user, signInMethods } = me.data
  const linkNotice = authNotice(params.get('error') ?? undefined)
  const linked = LINKABLE_PROVIDERS.find((provider) => provider === params.get('linked'))

  async function endOtherSessions() {
    try {
      await revokeOtherSessions.mutateAsync()
      setSessionNote('Other sessions are signed out.')
    } catch {
      setSessionNote('Other sessions could not be signed out. Try again.')
    }
  }

  async function endThisSession() {
    try {
      await signOut.mutateAsync()
    } finally {
      queryClient.clear()
      router.replace('/login')
    }
  }

  async function removeAccount() {
    await deleteAccount.mutateAsync({ confirm: 'DELETE', publicTutorials })
    await endThisSession()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>Signed in</CardDescription>
          <CardTitle className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-full"
              />
            ) : null}
            {user.name ?? user.email ?? 'Your account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {user.email ?? 'No email on this account.'}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign-in methods</CardTitle>
          <CardDescription>Connect GitHub to import private repositories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkNotice ? (
            <Alert tone="destructive" role="alert">
              {linkNotice}
            </Alert>
          ) : null}
          {linked && !linkNotice ? (
            <Alert role="status">{`${PROVIDER_LABELS[linked]} is connected.`}</Alert>
          ) : null}
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center justify-between gap-4 py-3">
              <span>Email and password</span>
              <span className="text-muted-foreground">
                {signInMethods.password ? 'Connected' : 'Not set'}
              </span>
            </li>
            {LINKABLE_PROVIDERS.map((provider) => (
              <li key={provider} className="flex items-center justify-between gap-4 py-3">
                <span>{PROVIDER_LABELS[provider]}</span>
                {signInMethods[provider] ? (
                  <span className="text-muted-foreground">Connected</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.assign(providerStartUrl(provider, 'link'))}
                  >
                    Connect {PROVIDER_LABELS[provider]}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
          <CardDescription>Sign out every other browser. This one stays signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            disabled={revokeOtherSessions.isPending}
            onClick={() => void endOtherSessions()}
          >
            {revokeOtherSessions.isPending ? 'Signing out…' : 'Sign out other sessions'}
          </Button>
          {sessionNote ? <Alert role="status">{sessionNote}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delete account</CardTitle>
          <CardDescription>
            Removes your keys, repositories, tutorials and progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDialog
            triggerLabel="Delete account"
            title="Delete your account?"
            description="This cannot be undone. Keys and progress are deleted at once."
            confirmLabel="Delete my account"
            confirmDisabled={confirmText !== 'DELETE'}
            run={removeAccount}
            describeError={(error) => describeAccountError(error)}
          >
            <FormField id="confirm-delete" label="Type DELETE to confirm">
              <Input
                id="confirm-delete"
                autoComplete="off"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
              />
            </FormField>
            <fieldset className="space-y-2 text-sm">
              <legend className="mb-2 font-medium">Your public tutorials</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="public-tutorials"
                  checked={publicTutorials === 'delete'}
                  onChange={() => setPublicTutorials('delete')}
                  className="size-4 accent-primary"
                />
                Delete them with my account
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="public-tutorials"
                  checked={publicTutorials === 'anonymise'}
                  onChange={() => setPublicTutorials('anonymise')}
                  className="size-4 accent-primary"
                />
                Keep them, without my name
              </label>
            </fieldset>
          </ConfirmDialog>
        </CardContent>
      </Card>
    </div>
  )
}

function describeAccountError(error: unknown): string {
  return apiErrorDetails(error)
    ? 'The account could not be deleted. Try again.'
    : 'Something went wrong. Try again.'
}
