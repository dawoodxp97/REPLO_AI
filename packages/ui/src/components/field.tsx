import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Label } from './label'

export function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset className={cn('flex min-w-0 flex-col gap-4', className)} {...props} />
}

export function FieldLegend({ className, ...props }: ComponentProps<'legend'>) {
  return <legend className={cn('mb-1 text-sm font-medium', className)} {...props} />
}

export function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex w-full flex-col gap-6', className)} {...props} />
}

const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: 'flex-col',
      horizontal: 'flex-row items-center [&>[data-slot=field-label]]:flex-auto',
    },
  },
  defaultVariants: { orientation: 'vertical' },
})

export function Field({
  className,
  orientation,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return <div role="group" className={cn(fieldVariants({ orientation }), className)} {...props} />
}

export function FieldContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-1 flex-col gap-1 leading-snug', className)} {...props} />
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn('leading-snug', className)} {...props} />
}

export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-[0.8125rem] leading-normal text-muted-foreground [&_a]:text-link [&_a]:underline [&_a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  )
}

export function FieldError({ className, children, ...props }: ComponentProps<'p'>) {
  if (!children) return null
  return (
    <p role="alert" className={cn('text-[0.8125rem] text-destructive', className)} {...props}>
      {children}
    </p>
  )
}

export interface FormFieldProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}

export function FormField({ id, label, hint, error, className, children }: FormFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
