import { Brand as UiBrand } from '@replo/ui'
import Link from 'next/link'
import type { ComponentProps } from 'react'

export function Brand(props: Omit<ComponentProps<typeof UiBrand>, 'linkComponent'>) {
  return <UiBrand linkComponent={Link} {...props} />
}
