'use client'

import { cn } from '@replo/ui'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Sheet } from '@/components/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { readPanelLayout, writePanelLayout } from './panel-layout'
import { PlayerHeader } from './player-header'
import { scrollContainerOf } from './scroll-within'

export interface PlayerLayoutProps {
  scrollKey: string
  title: string
  overviewHref: string
  sourceHref: string
  onOpenCommands: () => void
  outline: ReactNode
  body: ReactNode
  source: ReactNode
  sourceOpen: boolean
  onCloseSource: () => void
}

export const SOURCE_COLUMN_QUERY = '(min-width: 768px)'

const SEPARATOR_CLASS =
  'relative w-px bg-border outline-none transition-colors before:absolute before:inset-y-0 before:-inset-x-1 before:content-[""] hover:bg-ring/60 focus-visible:bg-ring focus-visible:before:bg-ring/30'

export function PlayerLayout({
  scrollKey,
  title,
  overviewHref,
  sourceHref,
  onOpenCommands,
  outline,
  body,
  source,
  sourceOpen,
  onCloseSource,
}: PlayerLayoutProps) {
  const wide = useMediaQuery(SOURCE_COLUMN_QUERY)
  const [outlineKey, setOutlineKey] = useState<string | null>(null)
  const outlineOpen = outlineKey === scrollKey
  const [defaultLayout] = useState(readPanelLayout)
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    const container = main.current ? scrollContainerOf(main.current) : null
    container?.scrollTo({ top: 0 })
  }, [scrollKey])

  return (
    <div className={cn('flex flex-col', wide ? 'h-dvh' : 'min-h-dvh')}>
      <PlayerHeader
        title={title}
        overviewHref={overviewHref}
        sourceHref={sourceHref}
        onOpenOutline={wide ? null : () => setOutlineKey(scrollKey)}
        onOpenCommands={onOpenCommands}
      />

      {wide ? (
        <Group
          orientation="horizontal"
          id="player"
          defaultLayout={defaultLayout}
          onLayoutChanged={writePanelLayout}
          className="min-h-0 flex-1"
        >
          <Panel id="outline" defaultSize="20%" minSize="12%" className="overflow-y-auto p-3">
            {outline}
          </Panel>
          <Separator className={SEPARATOR_CLASS} />
          <Panel id="lesson" minSize="35%" className="overflow-y-auto">
            <main ref={main}>{body}</main>
          </Panel>
          <Separator className={SEPARATOR_CLASS} />
          <Panel id="source" defaultSize="34%" minSize="22%" className="overflow-y-auto p-4">
            <aside aria-label="Source">{source}</aside>
          </Panel>
        </Group>
      ) : (
        <main className="flex-1">{body}</main>
      )}

      {!wide ? (
        <>
          <Sheet
            side="left"
            open={outlineOpen}
            onOpenChange={(open) => setOutlineKey(open ? scrollKey : null)}
            title="Lessons"
          >
            {outline}
          </Sheet>
          <Sheet
            side="bottom"
            open={sourceOpen}
            onOpenChange={(open) => {
              if (!open) onCloseSource()
            }}
            title="Source"
            description="The code this part of the lesson cites."
          >
            {source}
          </Sheet>
        </>
      ) : null}
    </div>
  )
}
