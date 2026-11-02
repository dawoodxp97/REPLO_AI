'use client'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
  Skeleton,
} from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { LoadMore } from '@/components/load-more'
import { SectionHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import { useRecentActivity } from './use-dashboard'

export function RecentActivity() {
  const recent = useRecentActivity()

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <SectionHeader id="activity-heading" title="Recent activity" />
      <QueryBoundary
        query={recent}
        errorTitle="Recent activity could not be loaded"
        errorDescription="Check your connection, then try again."
        loading={<Skeleton aria-busy="true" className="h-24 w-full" />}
      >
        {(data) => {
          const items = pageItems(data)
          if (items.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No activity yet</EmptyTitle>
                  <EmptyDescription>Activity appears here as you import and read.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          }
          return (
            <div className="space-y-2">
              <ItemGroup>
                {items.map((item) => (
                  <Item key={item.id} size="sm">
                    <ItemContent>
                      <ItemTitle className="font-normal">{item.title}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <span className="tabular font-mono text-xs text-muted-foreground">
                        {item.localDate}
                      </span>
                      {item.link ? (
                        <LinkButton href={item.link} variant="ghost" size="xs">
                          Open
                        </LinkButton>
                      ) : null}
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
              <LoadMore query={recent} />
            </div>
          )
        }}
      </QueryBoundary>
    </section>
  )
}
