import type { TutorialOverviewDto } from '@replo/contracts'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import Link from 'next/link'
import { CopyLinkButton } from '@/components/copy-link-button'
import { ArchitectureDiagram } from '@/features/diagram/architecture-diagram'
import { lessonPath, tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'
import { TutorialBanners } from './banners'
import { ReportForm } from './report-form'
import { TutorialOutline, withShare } from './tutorial-outline'

export interface TutorialOverviewProps {
  overview: TutorialOverviewDto
  shareUrl: string
  latestVersionHref: string | null
  shareToken?: string
}

export function TutorialOverview({
  overview,
  shareUrl,
  latestVersionHref,
  shareToken,
}: TutorialOverviewProps) {
  const { tutorial } = overview
  const ref: TutorialRef = { owner: tutorial.owner, repo: tutorial.repo, slug: tutorial.slug }
  const firstLesson = overview.outline[0]?.lessons[0]
  const firstChapter = overview.outline[0]

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-sm text-muted-foreground">
          {tutorial.owner}/{tutorial.repo} · at {overview.commitSha.slice(0, 7)}
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">{tutorial.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{tutorial.audience}</Badge>
          <Badge variant={tutorial.visibility === 'private' ? 'neutral' : 'observed'}>
            {tutorial.visibility}
          </Badge>
        </div>
        {firstChapter && firstLesson ? (
          <Link
            href={withShare(lessonPath(ref, firstChapter.key, firstLesson.key), shareToken)}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start reading
          </Link>
        ) : null}
        <Link
          href={`${tutorialPath(ref)}/progress`}
          className="text-sm text-primary underline underline-offset-4"
        >
          Your progress
        </Link>
      </header>

      <TutorialBanners overview={overview} latestVersionHref={latestVersionHref} />

      {overview.architectureDiagram ? (
        <section aria-labelledby="architecture-heading" className="space-y-4">
          <h2 id="architecture-heading" className="font-serif text-2xl font-medium">
            How the parts fit
          </h2>
          <ArchitectureDiagram
            mermaid={overview.architectureDiagram.mermaid}
            caption={overview.architectureDiagram.caption}
          />
        </section>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="objectives-heading" className="space-y-3">
          <h2 id="objectives-heading" className="font-serif text-2xl font-medium">
            Objectives
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {overview.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="prerequisites-heading" className="space-y-3">
          <h2 id="prerequisites-heading" className="font-serif text-2xl font-medium">
            Before you start
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {overview.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="outline-heading" className="space-y-6">
        <h2 id="outline-heading" className="font-serif text-2xl font-medium">
          Outline
        </h2>
        <TutorialOutline tutorial={ref} chapters={overview.outline} shareToken={shareToken} />
      </section>

      {overview.openQuestions.length > 0 ? (
        <section aria-labelledby="open-questions-heading" className="space-y-3">
          <h2 id="open-questions-heading" className="font-serif text-2xl font-medium">
            Open questions
          </h2>
          <p className="text-sm text-muted-foreground">
            The code does not settle these, so the tutorial does not answer them.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {overview.openQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {overview.versions.map((version) => (
                <li key={version.versionId}>
                  <Link
                    href={`${tutorialPath(ref)}?version=${version.versionNo}`}
                    className="text-primary underline underline-offset-4"
                  >
                    Version {version.versionNo}
                  </Link>{' '}
                  <span className="text-muted-foreground">
                    published {new Date(version.publishedAt).toLocaleDateString('en-GB')}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sharing and licence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Licence: {overview.license ?? 'none found in the repository'}
            </p>
            {tutorial.visibility === 'public' ? <CopyLinkButton url={shareUrl} /> : null}
            {tutorial.visibility === 'public' ? <ReportForm tutorialId={tutorial.id} /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
