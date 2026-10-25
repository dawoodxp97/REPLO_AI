'use client'

import type { SearchResults } from '@replo/contracts'
import { Input } from '@replo/ui'
import Link from 'next/link'
import { useState } from 'react'
import { lessonPath, tutorialPath } from '@/lib/tutorial-paths'
import type { ReactNode } from 'react'
import { useLibrarySearch } from './use-search'

const MIN_QUERY_LENGTH = 2

export function SearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { debounced, results } = useLibrarySearch(query)
  const showResults = open && debounced.length >= MIN_QUERY_LENGTH

  return (
    <div
      className="relative w-full sm:w-64"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <Input
        type="search"
        role="combobox"
        aria-label="Search your library"
        aria-expanded={showResults}
        aria-controls="library-search-results"
        placeholder="Search your library"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        className="h-9"
      />
      {showResults ? (
        <div
          id="library-search-results"
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-96 space-y-3 overflow-y-auto rounded-lg border border-border bg-popover p-3 text-sm shadow-lg"
        >
          {results.isPending ? (
            <p className="text-muted-foreground">Searching…</p>
          ) : results.isError ? (
            <p role="alert" className="text-destructive">
              Search is unavailable right now.
            </p>
          ) : (
            <SearchGroups results={results.data} onPick={() => setOpen(false)} />
          )}
        </div>
      ) : null}
    </div>
  )
}

function SearchGroups({ results, onPick }: { results: SearchResults; onPick: () => void }) {
  const empty =
    results.tutorials.length + results.lessons.length + results.repositories.length === 0
  if (empty) return <p className="text-muted-foreground">Nothing in your library matches.</p>

  return (
    <>
      {results.tutorials.length > 0 ? (
        <Group label="Tutorials">
          {results.tutorials.map((tutorial) => (
            <Link
              key={tutorial.tutorialId}
              href={tutorialPath(tutorial)}
              onClick={onPick}
              className="block rounded-md px-2 py-1.5 hover:bg-accent"
            >
              {tutorial.title}
              <span className="block font-mono text-xs text-muted-foreground">
                {tutorial.owner}/{tutorial.repo}
              </span>
            </Link>
          ))}
        </Group>
      ) : null}
      {results.lessons.length > 0 ? (
        <Group label="Lessons">
          {results.lessons.map((lesson) => {
            const tutorial = results.tutorials.find((item) => item.tutorialId === lesson.tutorialId)
            return tutorial ? (
              <Link
                key={lesson.versionId + lesson.lessonKey}
                href={lessonPath(tutorial, lesson.chapterKey, lesson.lessonKey)}
                onClick={onPick}
                className="block rounded-md px-2 py-1.5 hover:bg-accent"
              >
                {lesson.title}
              </Link>
            ) : (
              <p
                key={lesson.versionId + lesson.lessonKey}
                className="px-2 py-1.5 text-muted-foreground"
              >
                {lesson.title}
              </p>
            )
          })}
        </Group>
      ) : null}
      {results.repositories.length > 0 ? (
        <Group label="Repositories">
          {results.repositories.map((repository) => (
            <Link
              key={repository.repositoryId}
              href="/repositories"
              onClick={onPick}
              className="block rounded-md px-2 py-1.5 font-mono hover:bg-accent"
            >
              {repository.owner}/{repository.name}
            </Link>
          ))}
        </Group>
      ) : null}
    </>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h2>
      {children}
    </section>
  )
}
