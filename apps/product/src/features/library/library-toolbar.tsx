'use client'

import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from '@replo/ui'
import { ArrowUpDown, Search } from 'lucide-react'
import {
  LIBRARY_SORT_LABELS,
  type LibraryFilter,
  type LibrarySort,
  type VisibilityFilter,
} from './library-filter'
import { VISIBILITY_LABEL } from './visibility-options'

const VISIBILITY_FILTERS: readonly { value: VisibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'private', label: VISIBILITY_LABEL.private },
  { value: 'link', label: VISIBILITY_LABEL.link },
  { value: 'public', label: VISIBILITY_LABEL.public },
]

const SORTS = Object.keys(LIBRARY_SORT_LABELS) as LibrarySort[]

export function LibraryToolbar({
  filter,
  onChange,
}: {
  filter: LibraryFilter
  onChange: (next: LibraryFilter) => void
}) {
  const set = (patch: Partial<LibraryFilter>) => onChange({ ...filter, ...patch })

  return (
    <div
      role="group"
      aria-label="Filter tutorials"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Filter by title or repository"
          placeholder="Filter by title or repository"
          value={filter.query}
          onChange={(event) => set({ query: event.target.value })}
          className="pl-8"
        />
      </div>
      <ToggleGroup
        aria-label="Visibility"
        className="w-auto"
        value={[filter.visibility]}
        onValueChange={([next]) => {
          const picked = VISIBILITY_FILTERS.find((option) => option.value === next)
          if (picked) set({ visibility: picked.value })
        }}
      >
        {VISIBILITY_FILTERS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="px-2.5">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm pointer-coarse:min-h-10">
        <Checkbox
          checked={filter.hideFinished}
          onChange={(event) => set({ hideFinished: event.target.checked })}
        />
        Hide finished
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="sm:ml-auto" />}>
          <ArrowUpDown />
          {LIBRARY_SORT_LABELS[filter.sort]}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            value={filter.sort}
            onValueChange={(next: LibrarySort) => set({ sort: next })}
          >
            {SORTS.map((sort) => (
              <DropdownMenuRadioItem key={sort} value={sort}>
                {LIBRARY_SORT_LABELS[sort]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
