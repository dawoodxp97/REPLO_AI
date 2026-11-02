import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { SectionHeader } from '@/components/page-header'
import { AddKeyForm } from './add-key-form'
import { RecommendedKeyNote } from './recommended-key-note'
import { SavedKeys } from './saved-keys'

export function KeysSection() {
  return (
    <div className="space-y-8">
      <RecommendedKeyNote />

      <section className="space-y-4">
        <SectionHeader
          title="Saved keys"
          description="Shown only as …last4. Keys never leave the server."
        />
        <SavedKeys />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add a key</CardTitle>
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
