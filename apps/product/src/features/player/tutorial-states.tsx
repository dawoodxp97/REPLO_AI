import { Skeleton } from '@replo/ui'
import { ErrorPanel } from '@/components/error-panel'

export function PageSkeleton() {
  return <Skeleton aria-busy="true" className="m-4 h-96 w-[calc(100%-2rem)]" />
}

export function UnavailablePanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ErrorPanel title={title} description={description} />
    </div>
  )
}
