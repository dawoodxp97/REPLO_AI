import { Button, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Skeleton } from '@replo/ui'
import { LoadMore } from '@/components/load-more'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import { NotificationItem } from './notification-item'
import { useMarkAllRead, useNotificationList } from './use-notifications'

export function NotificationPanel({ open, unread }: { open: boolean; unread: number }) {
  const list = useNotificationList(open)
  const markAll = useMarkAllRead()
  const items = pageItems(list.data)
  const hasUnread = unread > 0 || items.some((item) => item.readAt === null)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 pt-1">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasUnread || markAll.isPending}
          onClick={() => markAll.mutate({})}
        >
          Mark all read
        </Button>
      </div>

      <QueryBoundary
        query={list}
        errorTitle="Notifications could not be loaded"
        errorDescription="Check your connection, then try again."
        loading={<Skeleton aria-busy="true" className="h-16 w-full" />}
      >
        {() =>
          items.length === 0 ? (
            <Empty className="border-0 p-4 md:p-6">
              <EmptyHeader>
                <EmptyTitle className="text-sm">Nothing new</EmptyTitle>
                <EmptyDescription>Jobs you start will report here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="scrollbar-thin max-h-96 divide-y overflow-y-auto">
              {items.map((item) => (
                <NotificationItem key={item.id} item={item} />
              ))}
            </ul>
          )
        }
      </QueryBoundary>

      <LoadMore query={list} />
    </div>
  )
}
