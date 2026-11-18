import type { SearchResults } from '@replo/contracts'
import {
  BookOpen,
  FileCode,
  FileText,
  FolderGit2,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatRepoName } from '@/lib/format'
import { codePath, coursePath, lessonPath, withQuery } from '@/lib/course-paths'

const HIT_CLASS =
  'flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent focus-visible:bg-accent focus-visible:-outline-offset-2'

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="px-2 text-xs font-medium text-muted-foreground">{label}</h2>
      {children}
    </section>
  )
}

function HitText({ title, meta }: { title: string; meta?: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate">{title}</span>
      {meta ? (
        <span className="block truncate font-mono text-xs text-muted-foreground">{meta}</span>
      ) : null}
    </span>
  )
}

function Hit({
  icon: Icon,
  href,
  onPick,
  children,
}: {
  icon: LucideIcon
  href: string
  onPick: () => void
  children: ReactNode
}) {
  return (
    <Link href={href} onClick={onPick} className={HIT_CLASS}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      {children}
    </Link>
  )
}

export function SearchGroups({ results, onPick }: { results: SearchResults; onPick: () => void }) {
  const empty =
    results.courses.length +
      results.lessons.length +
      results.repositories.length +
      results.files.length +
      results.dashboards.length ===
    0
  if (empty) return <p className="px-2 text-muted-foreground">Nothing matches.</p>

  return (
    <>
      {results.courses.length > 0 ? (
        <Group label="Courses">
          {results.courses.map((course) => (
            <Hit key={course.courseId} icon={BookOpen} href={coursePath(course)} onPick={onPick}>
              <HitText title={course.title} meta={formatRepoName(course.owner, course.repo)} />
            </Hit>
          ))}
        </Group>
      ) : null}
      {results.lessons.length > 0 ? (
        <Group label="Lessons">
          {results.lessons.map((lesson) => (
            <Hit
              key={`${lesson.versionId}/${lesson.chapterKey}/${lesson.lessonKey}`}
              icon={FileText}
              href={lessonPath(lesson, lesson.chapterKey, lesson.lessonKey)}
              onPick={onPick}
            >
              <HitText title={lesson.title} meta={lesson.courseTitle} />
            </Hit>
          ))}
        </Group>
      ) : null}
      {results.files.length > 0 ? (
        <Group label="Files">
          {results.files.map((file) => (
            <Hit
              key={`${file.versionId}/${file.path}`}
              icon={FileCode}
              href={withQuery(codePath(file), { path: file.path })}
              onPick={onPick}
            >
              <HitText title={file.path} meta={formatRepoName(file.owner, file.repo)} />
            </Hit>
          ))}
        </Group>
      ) : null}
      {results.dashboards.length > 0 ? (
        <Group label="Saved dashboards">
          {results.dashboards.map((dashboard) => (
            <Hit
              key={dashboard.dashboardId}
              icon={LayoutDashboard}
              href={withQuery('/', { dashboard: dashboard.dashboardId })}
              onPick={onPick}
            >
              <span className="min-w-0 truncate">{dashboard.name}</span>
            </Hit>
          ))}
        </Group>
      ) : null}
      {results.repositories.length > 0 ? (
        <Group label="Repositories">
          {results.repositories.map((repository) => (
            <Hit
              key={repository.repositoryId}
              icon={FolderGit2}
              href="/repositories"
              onPick={onPick}
            >
              <span className="min-w-0 truncate font-mono">
                {formatRepoName(repository.owner, repository.name)}
              </span>
            </Hit>
          ))}
        </Group>
      ) : null}
    </>
  )
}
