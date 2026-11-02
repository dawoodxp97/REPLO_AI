import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible'
import { cn } from '../lib/cn'
import type { BaseProps } from '../lib/types'

export const Collapsible = BaseCollapsible.Root
export const CollapsibleTrigger = BaseCollapsible.Trigger

export function CollapsibleContent({
  className,
  ...props
}: BaseProps<typeof BaseCollapsible.Panel>) {
  return <BaseCollapsible.Panel className={cn('overflow-hidden', className)} {...props} />
}
