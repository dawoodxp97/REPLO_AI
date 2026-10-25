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
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ErrorPanel } from '@/components/error-panel'
import { apiErrorDetails } from '@/lib/api-error'
import { revokeOtherSessions, signOut } from '@/lib/auth-client'
import { orpc } from '@/lib/orpc'

type PublicTutorials = 'delete' | 'anonymise'

export function ProfileSection() {
  const me = useQuery(orpc.me.get.queryOptions())
  const deleteAccount = useMutation(orpc.me.deleteAccount.mutationOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [sessionNote, setSessionNote] = useState<string | null>(null)
  const [sessionsPending, setSessionsPending] = useState(false)
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

  const user = me.data.user

  async function endOtherSessions() {
    setSessionsPending(true)
    const result = await revokeOtherSessions()
    setSessionNote(
      result.error
        ? 'Other sessions could not be signed out. Try again.'
        : 'Other sessions are signed out.',
    )
    setSessionsPending(false)
  }

  async function removeAccount() {
    await deleteAccount.mutateAsync({ confirm: 'DELETE', publicTutorials })
    await signOut()
    queryClient.clear()
    router.replace('/')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>Signed in with GitHub</CardDescription>
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
          {user.email ?? 'No email on your GitHub account.'}
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
            disabled={sessionsPending}
            onClick={() => void endOtherSessions()}
          >
            {sessionsPending ? 'Signing out…' : 'Sign out other sessions'}
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
