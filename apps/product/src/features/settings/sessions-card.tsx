'use client'

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { Check, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { orpc } from '@/lib/orpc'

export function SessionsCard() {
  const revoke = useMutation(orpc.auth.revokeOtherSessions.mutationOptions())
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  async function endOtherSessions() {
    setNote(null)
    try {
      await revoke.mutateAsync()
      setNote({ ok: true, text: 'Other sessions are signed out.' })
    } catch {
      setNote({ ok: false, text: 'Other sessions could not be signed out. Try again.' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>Sign out every other browser. This one stays signed in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button
            variant="outline"
            disabled={revoke.isPending}
            onClick={() => void endOtherSessions()}
          >
            {revoke.isPending ? 'Signing out…' : 'Sign out other sessions'}
          </Button>
        </div>
        {note ? (
          <Alert variant={note.ok ? 'observed' : 'destructive'} role={note.ok ? 'status' : 'alert'}>
            {note.ok ? <Check /> : <CircleAlert />}
            <AlertDescription>{note.text}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
