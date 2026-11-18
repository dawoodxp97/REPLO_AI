import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CourseContent } from '@replo/contracts'
import { z } from 'zod'

export const CourseTelemetry = z.object({
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
})
export type CourseTelemetry = z.infer<typeof CourseTelemetry>

export const CourseArtifact = z.object({
  repo: z.string().min(1),
  pipeline: z.enum(['full', 'lite']),
  content: CourseContent,
  telemetry: CourseTelemetry,
})
export type CourseArtifact = z.infer<typeof CourseArtifact>

export async function loadCourseArtifacts(directory: string): Promise<CourseArtifact[]> {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort()
  return Promise.all(
    names.map(async (name) =>
      CourseArtifact.parse(JSON.parse(await readFile(join(directory, name), 'utf8'))),
    ),
  )
}
