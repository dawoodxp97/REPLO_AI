import { Alert, AlertDescription } from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
