import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import type { ReactNode } from 'react'

export interface ErrorPanelProps {
  title: string
  description: string
  action?: ReactNode
}

export function ErrorPanel({ title, description, action }: ErrorPanelProps) {
  return (
    <Card role="alert">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  )
}
