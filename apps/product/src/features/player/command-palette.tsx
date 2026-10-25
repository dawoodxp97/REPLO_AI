'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@replo/ui'
import { useState } from 'react'
import { filterCommands } from './command-filter'

export interface PaletteItem {
  id: string
  label: string
  run: () => void
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly PaletteItem[]
}

export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const matches = filterCommands(items, query)

  function close() {
    setQuery('')
    onOpenChange(false)
  }

  function runItem(item: PaletteItem) {
    close()
    item.run()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else close()
      }}
    >
      <DialogContent className="top-[18%] -translate-y-0">
        <DialogTitle>Commands</DialogTitle>
        <DialogDescription>Jump to a lesson or run an action.</DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const first = matches[0]
            if (first) runItem(first)
          }}
        >
          <Input
            autoFocus
            aria-label="Search commands"
            placeholder="Type a lesson or command"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No command matches “{query}”.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {matches.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => runItem(item)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
