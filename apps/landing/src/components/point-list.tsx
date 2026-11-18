import { cn } from '@replo/ui'

export function PointList({
  points,
  className,
}: {
  points: readonly { title: string; body: string }[]
  className?: string
}) {
  return (
    <dl className={cn('grid gap-8', className)}>
      {points.map((point) => (
        <div key={point.title} className="border-t pt-5">
          <dt className="text-base font-semibold tracking-tight">{point.title}</dt>
          <dd className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
            {point.body}
          </dd>
        </div>
      ))}
    </dl>
  )
}
