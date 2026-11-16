import type { CourseOverviewDto } from '@replo/contracts'
import { Badge } from '@replo/ui'
import { AUDIENCE_LABELS } from '@/features/preferences/audience'
import { LinkButton } from '@/components/link-button'
import { SectionHeader, TitledSection } from '@/components/page-header'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import { formatRepoName, shortSha } from '@/lib/format'
import { createCourseLinks, type CourseLinkContext, type CourseRef } from '@/lib/course-paths'
import { CourseBanners } from './banners'
import { CourseOutline } from './course-outline'
import { VersionList } from './version-list'

export interface CourseOverviewProps {
  overview: CourseOverviewDto
  latestVersionHref: string | null
  versionNo?: number
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm marker:text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function CourseOverview({ overview, latestVersionHref, versionNo }: CourseOverviewProps) {
  const { course } = overview
  const ref: CourseRef = { owner: course.owner, repo: course.repo, slug: course.slug }
  const firstChapter = overview.outline[0]
  const firstLesson = firstChapter?.lessons[0]
  const linkContext: CourseLinkContext = { version: versionNo }
  const links = createCourseLinks(ref, linkContext)
  const viewing = overview.versions.find((version) => version.versionId === overview.versionId)

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground">
          {formatRepoName(course.owner, course.repo)} · commit {shortSha(overview.commitSha)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{course.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{AUDIENCE_LABELS[course.audience]}</Badge>
          {viewing ? <Badge variant="outline">Version {viewing.versionNo}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {firstChapter && firstLesson ? (
            <LinkButton
              href={links.lesson({ chapterKey: firstChapter.key, lessonKey: firstLesson.key })}
            >
              Start reading
            </LinkButton>
          ) : null}
          <LinkButton href={links.progress()} variant="outline">
            Your progress
          </LinkButton>
        </div>
      </header>

      <CourseBanners overview={overview} latestVersionHref={latestVersionHref} />

      {overview.architectureDiagram ? (
        <section aria-labelledby="architecture-heading" className="space-y-4">
          <SectionHeader id="architecture-heading" title="How the parts fit" />
          <ArchitectureDiagram
            mermaid={overview.architectureDiagram.mermaid}
            caption={overview.architectureDiagram.caption}
          />
        </section>
      ) : null}

      {overview.objectives.length > 0 || overview.prerequisites.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2">
          {overview.objectives.length > 0 ? (
            <TitledSection id="objectives-heading" title="Objectives">
              <BulletList items={overview.objectives} />
            </TitledSection>
          ) : null}
          {overview.prerequisites.length > 0 ? (
            <TitledSection id="prerequisites-heading" title="Before you start">
              <BulletList items={overview.prerequisites} />
            </TitledSection>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="outline-heading" className="space-y-4">
        <SectionHeader id="outline-heading" title="Outline" />
        <CourseOutline course={ref} chapters={overview.outline} linkContext={linkContext} />
      </section>

      {overview.openQuestions.length > 0 ? (
        <TitledSection
          id="open-questions-heading"
          title="Open questions"
          description="The code does not settle these, so the course does not answer them."
        >
          <BulletList items={overview.openQuestions} />
        </TitledSection>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2">
        <TitledSection id="versions-heading" title="Versions">
          <VersionList
            course={ref}
            versions={overview.versions}
            currentVersionId={overview.versionId}
          />
        </TitledSection>
      </div>
    </div>
  )
}
