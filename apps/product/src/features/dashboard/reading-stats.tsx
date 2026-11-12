import type { DashboardSummary } from '@replo/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import { formatCount } from '@/lib/format'

type Reading = DashboardSummary['reading']

function quizLine(reading: Reading): string {
  if (reading.quizAnswers === 0) return 'No quiz answers yet'
  return `${formatCount(reading.quizAnswersCorrect)} of ${formatCount(reading.quizAnswers)} correct`
}

export function ReadingStats({ reading }: { reading: Reading }) {
  const rows = [
    {
      label: 'Lessons finished',
      value: formatCount(reading.lessonsCompleted),
      note: `${formatCount(reading.lessonsCompletedLast7Days)} in the last 7 days`,
    },
    {
      label: 'Quiz answers',
      value: formatCount(reading.quizAnswers),
      note: quizLine(reading),
    },
  ]

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Reading</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="tabular font-mono text-2xl leading-tight">{row.value}</dd>
              <dd className="text-xs text-muted-foreground">{row.note}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
