import type { TutorialOverviewDto } from '@replo/contracts'
import { Badge, Item, ItemGroup } from '@replo/ui'
import Link from 'next/link'
import { formatDate } from '@/lib/format'
import { createTutorialLinks, type TutorialRef } from '@/lib/tutorial-paths'

export function VersionList({
  tutorial,
  versions,
  currentVersionId,
  shareToken,
}: {
  tutorial: TutorialRef
  versions: TutorialOverviewDto['versions']
  currentVersionId: string
  shareToken: string | undefined
}) {
  return (
    <ItemGroup>
      {versions.map((version) => {
        const current = version.versionId === currentVersionId
        return (
          <Item key={version.versionId} className="p-0">
            <Link
              href={createTutorialLinks(tutorial, {
                version: version.versionNo,
                shareToken,
              }).overview()}
              aria-current={current ? 'page' : undefined}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:-outline-offset-2"
            >
              <span className="flex items-center gap-2">
                <span className={current ? 'font-medium' : undefined}>
                  Version {version.versionNo}
                </span>
                {current ? <Badge variant="outline">Viewing</Badge> : null}
              </span>
              <span className="tabular font-mono text-xs text-muted-foreground">
                {formatDate(version.publishedAt)}
              </span>
            </Link>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
