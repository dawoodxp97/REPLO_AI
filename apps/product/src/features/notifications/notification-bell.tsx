'use client'

import { Button, Popover, PopoverContent, PopoverTrigger } from '@replo/ui'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { NotificationPanel } from './notification-panel'
import { useUnreadCount } from './use-notifications'

const MAX_SHOWN = 99

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const unread = useUnreadCount().data?.count ?? 0
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" aria-label={label} className="relative" />}
      >
        <Bell />
        {unread > 0 ? (
          <span
            aria-hidden
            className="tabular absolute top-0.5 right-0.5 min-w-4 rounded-full bg-primary px-1 text-micro leading-4 font-medium text-primary-foreground"
          >
            {unread > MAX_SHOWN ? `${MAX_SHOWN}+` : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent>
        <NotificationPanel open={open} unread={unread} />
      </PopoverContent>
    </Popover>
  )
}
