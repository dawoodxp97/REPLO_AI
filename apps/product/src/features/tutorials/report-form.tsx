'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, FormField, Textarea } from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { orpc } from '@/lib/orpc'

const ReportValues = z.object({ reason: z.string().trim().min(1).max(1000) })
type ReportValues = z.infer<typeof ReportValues>

export function ReportForm({ tutorialId }: { tutorialId: string }) {
  const report = useMutation(orpc.tutorials.report.mutationOptions())
  const form = useForm<ReportValues>({
    resolver: zodResolver(ReportValues),
    defaultValues: { reason: '' },
  })

  if (report.isSuccess) {
    return (
      <Alert role="status">
        Thanks. Reports are reviewed by hand, and we may remove the tutorial.
      </Alert>
    )
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => report.mutate({ tutorialId, reason: values.reason }))}
    >
      <FormField
        id="report-reason"
        label="Report this tutorial"
        hint="Tell us what is wrong: an unsafe link, private code, or a claim the source does not support."
        error={
          form.formState.errors.reason
            ? 'Describe the problem in up to 1,000 characters.'
            : undefined
        }
      >
        <Textarea
          id="report-reason"
          aria-invalid={form.formState.errors.reason ? true : undefined}
          {...form.register('reason')}
        />
      </FormField>
      {report.isError ? (
        <Alert tone="destructive" role="alert">
          The report could not be sent. Try again.
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={report.isPending}>
        {report.isPending ? 'Sending…' : 'Send report'}
      </Button>
    </form>
  )
}
