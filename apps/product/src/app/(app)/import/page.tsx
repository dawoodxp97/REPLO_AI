import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { ImportForm } from '@/features/import/import-form'

export const metadata: Metadata = { title: 'Import a repository' }

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Import a repository"
        description="Pre-flight runs first (no AI): languages, size and framework — or a specific reason we can’t proceed."
      />
      <ImportForm />
    </div>
  )
}
