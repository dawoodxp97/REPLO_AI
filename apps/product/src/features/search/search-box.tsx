'use client'

import { Input, Kbd, Spinner } from '@replo/ui'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { moveFocus } from './result-focus'
import { SearchGroups } from './search-results'
import { MIN_QUERY_LENGTH, useLibrarySearch } from './use-search'
import { useSearchShortcut } from './use-search-shortcut'

const RESULTS_ID = 'library-search-results'

export function SearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const { debounced, results } = useLibrarySearch(query)
  const modifierLabel = useSearchShortcut(input)
  const showResults = open && debounced.length >= MIN_QUERY_LENGTH

  return (
    <div
      className="relative w-full sm:w-64"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false)
          input.current?.focus()
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (showResults) moveFocus(event, panel.current, input.current)
        }
      }}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search your library"
        aria-expanded={showResults}
        aria-controls={RESULTS_ID}
        aria-autocomplete="list"
        placeholder="Search your library"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        className="h-9 pr-14 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {query === '' ? (
        <Kbd aria-hidden className="absolute top-1/2 right-2 -translate-y-1/2">
          {modifierLabel === '⌘' ? '⌘K' : 'Ctrl K'}
        </Kbd>
      ) : null}
      {showResults ? (
        <div
          ref={panel}
          id={RESULTS_ID}
          className="absolute top-full right-0 z-40 mt-2 max-h-96 w-80 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto rounded-lg border bg-popover p-2 text-sm text-popover-foreground shadow-md"
        >
          {results.isPending ? (
            <p className="flex items-center gap-2 px-2 text-muted-foreground">
              <Spinner />
              Searching…
            </p>
          ) : results.isError ? (
            <p role="alert" className="px-2 text-destructive">
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
