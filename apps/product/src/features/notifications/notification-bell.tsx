'use client'

import type { NotificationDto } from '@replo/contracts'
import { Alert, Button, Popover, PopoverContent, PopoverTrigger, Skeleton } from '@replo/ui'
import Link from 'next/link'
import { useState } from 'react'
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from './use-notifications'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount().data?.count ?? 0
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} className="relative" />}
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-primary px-1 text-[0.625rem] leading-4 font-semibold text-primary-foreground"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent>
        <NotificationPanel open={open} />
      </PopoverContent>
    </Popover>
  )
}

function NotificationPanel({ open }: { open: boolean }) {
  const list = useNotificationList(open)
  const markAll = useMarkAllRead()
  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const hasUnread = items.some((item) => item.readAt === null)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 pt-1">
        <h2 className="text-sm font-medium">Notifications</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasUnread || markAll.isPending}
          onClick={() => markAll.mutate({})}
        >
          Mark all read
        </Button>
      </div>

      {list.isPending ? (
        <Skeleton aria-busy="true" className="h-16 w-full" />
      ) : list.isError ? (
        <Alert tone="destructive" role="alert">
          Notifications could not be loaded.
        </Alert>
      ) : items.length === 0 ? (
        <p className="px-2 py-4 text-sm text-muted-foreground">
          Nothing new. Jobs you start will report here.
        </p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </ul>
      )}

      {list.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}

function NotificationItem({ item }: { item: NotificationDto }) {
  const markRead = useMarkRead()
  const remove = useDeleteNotification()
  const unread = item.readAt === null

  const body = (
    <>
      <p className={unread ? 'text-sm font-medium' : 'text-sm text-muted-foreground'}>
        {item.title}
      </p>
      {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
    </>
  )

  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-accent">
      <div className="min-w-0 flex-1">
        {item.link ? (
          <Link
            href={item.link}
            className="block rounded-sm underline-offset-4 hover:underline"
            onClick={() => {
              if (unread) markRead.mutate({ id: item.id })
            }}
          >
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {unread ? (
          <Button variant="ghost" size="sm" onClick={() => markRead.mutate({ id: item.id })}>
            Mark read
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove notification: ${item.title}`}
          disabled={remove.isPending}
          onClick={() => remove.mutate({ id: item.id })}
        >
          Remove
        </Button>
      </div>
    </li>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  )
}
