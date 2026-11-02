import type { NotificationDto } from '@replo/contracts'
import { Button, cn } from '@replo/ui'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useDeleteNotification, useMarkRead } from './use-notifications'

export function NotificationItem({ item }: { item: NotificationDto }) {
  const markRead = useMarkRead()
  const remove = useDeleteNotification()
  const unread = item.readAt === null

  const body = (
    <>
      <p className={cn('text-sm', unread ? 'font-medium' : 'text-muted-foreground')}>
        {item.title}
      </p>
      {item.body ? <p className="text-xs text-muted-foreground">{item.body}</p> : null}
    </>
  )

  return (
    <li className="flex items-start gap-2 px-2 py-2.5">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          unread ? 'bg-foreground' : 'bg-transparent',
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        {item.link ? (
          <Link
            href={item.link}
            className="block rounded-sm underline-offset-4 hover:underline focus-visible:underline"
            onClick={() => {
              if (unread) markRead.mutate({ id: item.id })
            }}
          >
            {body}
          </Link>
        ) : (
          body
        )}
        {unread ? (
          <Button
            variant="ghost"
            size="xs"
            className="-ml-2 text-muted-foreground"
            disabled={markRead.isPending}
            onClick={() => markRead.mutate({ id: item.id })}
          >
            Mark read
          </Button>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove notification: ${item.title}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate({ id: item.id })}
      >
        <X />
      </Button>
    </li>
  )
}
