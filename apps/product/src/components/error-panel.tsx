import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ErrorPanelProps {
  title: string
  description: ReactNode
  action?: ReactNode
}

export function ErrorPanel({ title, description, action }: ErrorPanelProps) {
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </AlertDescription>
    </Alert>
  )
}
