import { STAGES } from '@replo/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import { useEffect, useState } from 'react'
import type { JobProgress } from './job-progress-state'
import { StageRow } from './stage-row'

export function StageList({ progress }: { progress: JobProgress }) {
  const anyRunning = STAGES.some((stage) => progress.stages[stage] === 'running')
  const now = useNow(anyRunning)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stages</CardTitle>
      </CardHeader>
      <CardContent>
        <ol aria-label="Generation stages">
          {STAGES.map((stage, index) => (
            <StageRow
              key={stage}
              stage={stage}
              state={progress.stages[stage]}
              timing={progress.timings[stage]}
              now={now}
              isLast={index === STAGES.length - 1}
            />
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function useNow(active: boolean, intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])

  return now
}
