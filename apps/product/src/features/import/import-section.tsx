import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import type { ReactNode } from 'react'

export interface ImportSectionProps {
  title: string
  description: string
  children: ReactNode
}

export function ImportSection({ title, description, children }: ImportSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}
