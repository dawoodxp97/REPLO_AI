import type { TutorialOverviewDto } from '@replo/contracts'
import { Badge, Card, CardContent, Separator } from '@replo/ui'
import { CopyLinkButton } from '@/components/copy-link-button'
import { DescriptionItem } from '@/components/description-item'
import { LinkButton } from '@/components/link-button'
import { SectionHeader } from '@/components/page-header'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import {
  lessonPath,
  withTutorialContext,
  type TutorialLinkContext,
  type TutorialRef,
} from '@/lib/tutorial-paths'
import { TutorialBanners } from './banners'
import { ReportForm } from './report-form'
import { createTutorialLinks } from '@/lib/tutorial-paths'
import { TutorialOutline } from './tutorial-outline'
import { VersionList } from './version-list'

export interface TutorialOverviewProps {
  overview: TutorialOverviewDto
  shareUrl: string
  latestVersionHref: string | null
  shareToken?: string
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

export function TutorialOverview({
  overview,
  shareUrl,
  latestVersionHref,
  shareToken,
  versionNo,
}: TutorialOverviewProps) {
  const { tutorial } = overview
  const ref: TutorialRef = { owner: tutorial.owner, repo: tutorial.repo, slug: tutorial.slug }
  const firstChapter = overview.outline[0]
  const firstLesson = firstChapter?.lessons[0]
  const linkContext: TutorialLinkContext = { version: versionNo, shareToken }
  const viewing = overview.versions.find((version) => version.versionId === overview.versionId)

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground">
          {tutorial.owner}/{tutorial.repo} · commit {overview.commitSha.slice(0, 7)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{tutorial.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{tutorial.audience}</Badge>
          <Badge variant="outline">{tutorial.visibility}</Badge>
          {viewing ? <Badge variant="outline">Version {viewing.versionNo}</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {firstChapter && firstLesson ? (
            <LinkButton
              href={withTutorialContext(
                lessonPath(ref, firstChapter.key, firstLesson.key),
                linkContext,
              )}
            >
              Start reading
            </LinkButton>
          ) : null}
          <LinkButton href={createTutorialLinks(ref, linkContext).progress()} variant="outline">
            Your progress
          </LinkButton>
        </div>
      </header>

      <TutorialBanners overview={overview} latestVersionHref={latestVersionHref} />

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
            <section aria-labelledby="objectives-heading" className="space-y-3">
              <SectionHeader id="objectives-heading" title="Objectives" />
              <BulletList items={overview.objectives} />
            </section>
          ) : null}
          {overview.prerequisites.length > 0 ? (
            <section aria-labelledby="prerequisites-heading" className="space-y-3">
              <SectionHeader id="prerequisites-heading" title="Before you start" />
              <BulletList items={overview.prerequisites} />
            </section>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="outline-heading" className="space-y-4">
        <SectionHeader id="outline-heading" title="Outline" />
        <TutorialOutline tutorial={ref} chapters={overview.outline} linkContext={linkContext} />
      </section>

      {overview.openQuestions.length > 0 ? (
        <section aria-labelledby="open-questions-heading" className="space-y-3">
          <SectionHeader
            id="open-questions-heading"
            title="Open questions"
            description="The code does not settle these, so the tutorial does not answer them."
          />
          <BulletList items={overview.openQuestions} />
        </section>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="versions-heading" className="space-y-3">
          <SectionHeader id="versions-heading" title="Versions" />
          <VersionList
            tutorial={ref}
            versions={overview.versions}
            currentVersionId={overview.versionId}
            shareToken={shareToken}
          />
        </section>

        <section aria-labelledby="sharing-heading" className="space-y-3">
          <SectionHeader id="sharing-heading" title="Sharing and licence" />
          <Card>
            <CardContent className="space-y-4">
              <dl className="space-y-4">
                <DescriptionItem label="Licence">
                  {overview.license ?? 'None found in the repository'}
                </DescriptionItem>
                {tutorial.visibility === 'public' ? (
                  <DescriptionItem label="Public link">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 font-mono text-xs break-all">{shareUrl}</code>
                      <CopyLinkButton url={shareUrl} />
                    </div>
                  </DescriptionItem>
                ) : null}
              </dl>
              {tutorial.visibility === 'public' ? (
                <>
                  <Separator />
                  <ReportForm tutorialId={tutorial.id} shareToken={shareToken} />
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
