import type { SearchResults } from '@replo/contracts'
import { BookOpen, FileText, FolderGit2, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatRepoName } from '@/lib/format'
import { lessonPath, tutorialPath } from '@/lib/tutorial-paths'

const HIT_CLASS =
  'flex items-start gap-2.5 rounded-md px-2 py-1.5 outline-none hover:bg-accent focus-visible:bg-accent'

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
    results.tutorials.length + results.lessons.length + results.repositories.length === 0
  if (empty) return <p className="px-2 text-muted-foreground">Nothing in your library matches.</p>

  return (
    <>
      {results.tutorials.length > 0 ? (
        <Group label="Tutorials">
          {results.tutorials.map((tutorial) => (
            <Hit
              key={tutorial.tutorialId}
              icon={BookOpen}
              href={tutorialPath(tutorial)}
              onPick={onPick}
            >
              <HitText
                title={tutorial.title}
                meta={formatRepoName(tutorial.owner, tutorial.repo)}
              />
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
              <HitText title={lesson.title} meta={lesson.tutorialTitle} />
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
