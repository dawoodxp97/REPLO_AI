'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  FormField,
  Spinner,
  Textarea,
} from '@replo/ui'
import { useMutation } from '@tanstack/react-query'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { orpc } from '@/lib/orpc'

const ReportValues = z.object({ reason: z.string().trim().min(1).max(1000) })
type ReportValues = z.infer<typeof ReportValues>

export function ReportForm({
  tutorialId,
  shareToken,
}: {
  tutorialId: string
  shareToken?: string | undefined
}) {
  const report = useMutation(orpc.tutorials.report.mutationOptions())
  const form = useForm<ReportValues>({
    resolver: zodResolver(ReportValues),
    defaultValues: { reason: '' },
  })

  if (report.isSuccess) {
    return (
      <Alert variant="observed" role="status">
        <CircleCheck />
        <AlertTitle>Report sent</AlertTitle>
        <AlertDescription>
          <p>Reports are reviewed by hand, and the tutorial may be removed.</p>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={form.handleSubmit((values) =>
        report.mutate({ tutorialId, reason: values.reason, shareToken }),
      )}
    >
      <FormField
        id="report-reason"
        label="Report this tutorial"
        hint="Describe what is wrong: an unsafe link, private code, or a claim the source does not support."
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
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertTitle>The report was not sent</AlertTitle>
          <AlertDescription>
            <p>Check your connection, then send it again.</p>
          </AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={report.isPending}>
        {report.isPending ? <Spinner /> : null}
        {report.isPending ? 'Sending…' : 'Send report'}
      </Button>
    </form>
  )
}
