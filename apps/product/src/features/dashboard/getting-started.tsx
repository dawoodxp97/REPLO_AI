import { ArrowRight } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { RecommendedKeyNote } from '@/features/keys/recommended-key-note'
import { importPath, NEW_TUTORIAL_LABEL } from '@/lib/import-path'

export function GettingStarted() {
  return (
    <section
      aria-labelledby="getting-started-title"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="space-y-4">
          <p className="font-mono text-xs text-muted-foreground">Start here</p>
          <h2 id="getting-started-title" className="text-xl font-semibold tracking-tight">
            Make an unfamiliar codebase feel familiar.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            No tutorials yet. Start with a repository you want to understand, and build a reading
            path through its architecture and source.
          </p>
          <LinkButton href={importPath()}>
            {NEW_TUTORIAL_LABEL} <ArrowRight aria-hidden="true" />
          </LinkButton>
        </div>
        <ol className="divide-y text-sm">
          <li className="flex gap-3 pb-4">
            <span className="pt-0.5 font-mono text-xs text-muted-foreground">01</span>
            <div className="space-y-1">
              <p className="font-medium">Add a model key</p>
              <p className="text-muted-foreground">Choose your provider in API key settings.</p>
            </div>
          </li>
          <li className="flex gap-3 py-4">
            <span className="pt-0.5 font-mono text-xs text-muted-foreground">02</span>
            <div className="space-y-1">
              <p className="font-medium">Choose a repository</p>
              <p className="text-muted-foreground">Review the pre-flight check and run estimate.</p>
            </div>
          </li>
          <li className="flex gap-3 pt-4">
            <span className="pt-0.5 font-mono text-xs text-muted-foreground">03</span>
            <div className="space-y-1">
              <p className="font-medium">Follow the code</p>
              <p className="text-muted-foreground">
                Read each lesson with its pinned source alongside.
              </p>
            </div>
          </li>
        </ol>
      </div>
      <div className="flex flex-col items-start gap-4 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:px-8">
        <div className="min-w-0 flex-1">
          <RecommendedKeyNote />
        </div>
        <LinkButton href="/settings/keys" variant="outline" className="shrink-0">
          Manage keys
        </LinkButton>
      </div>
    </section>
  )
}
