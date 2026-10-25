'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@replo/ui'
import { ErrorPanel } from '@/components/error-panel'
import { AddKeyForm } from './add-key-form'
import { KeyRow } from './key-row'
import { RecommendedKeyNote } from './recommended-key-note'
import { useKeys } from './use-keys'

export function KeysSection() {
  const keys = useKeys()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription>Your AI key</CardDescription>
          <CardTitle>Bring your own key</CardTitle>
        </CardHeader>
        <CardContent>
          <RecommendedKeyNote />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved keys</CardTitle>
          <CardDescription>Shown only as …last4. Keys never leave the server.</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.isPending ? (
            <Skeleton aria-busy="true" className="h-16 w-full" />
          ) : keys.isError ? (
            <ErrorPanel
              title="We could not load your keys"
              description="Check your connection, then reload this page."
            />
          ) : keys.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keys saved yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {keys.data.map((key) => (
                <KeyRow key={key.id} keyDto={key} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a key</CardTitle>
          <CardDescription>
            The key is checked with the provider before it is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddKeyForm />
        </CardContent>
      </Card>
    </div>
  )
}
