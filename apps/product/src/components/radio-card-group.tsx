import { cn, FieldLegend, FieldSet, RadioGroupItem } from '@replo/ui'

export interface RadioCardOption<T extends string> {
  value: T
  title: string
  description: string
}

export interface RadioCardGroupProps<T extends string> {
  name: string
  legend: string
  options: readonly RadioCardOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
  columns?: 'auto' | 2
  className?: string
}

export function RadioCardGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  columns = 'auto',
  className,
}: RadioCardGroupProps<T>) {
  return (
    <FieldSet className={cn('gap-2', className)}>
      <FieldLegend>{legend}</FieldLegend>
      <div
        className={cn(
          'grid gap-2.5',
          columns === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]',
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3.5 shadow-xs transition-colors hover:bg-accent/50 has-[:checked]:border-primary/60 has-[:checked]:bg-accent/60 has-[:checked]:ring-1 has-[:checked]:ring-primary/60"
          >
            <RadioGroupItem
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm leading-none font-medium">{option.title}</span>
              <span className="text-compact leading-snug text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </FieldSet>
  )
}
