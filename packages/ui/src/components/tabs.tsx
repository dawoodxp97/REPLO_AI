import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { cn } from '../lib/cn'
import type { BaseProps } from '../lib/types'

export function Tabs({ className, ...props }: BaseProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root className={cn('flex flex-col gap-4', className)} {...props} />
}

export function TabsList({ className, ...props }: BaseProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn(
        'inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: BaseProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        'inline-flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-xs data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: BaseProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={cn('outline-none', className)} {...props} />
}
