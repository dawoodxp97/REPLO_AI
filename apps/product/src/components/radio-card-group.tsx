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
}

export function RadioCardGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: RadioCardGroupProps<T>) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-lg border border-border bg-card p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="size-4 accent-primary"
              />
              {option.title}
            </span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
