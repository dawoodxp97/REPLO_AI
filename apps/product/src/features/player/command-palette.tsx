'use client'

import { Dialog, DialogContent, DialogDescription, DialogTitle, Input, Kbd } from '@replo/ui'
import { Search } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { filterCommands } from './command-filter'
import { groupCommands, type PaletteItem } from './palette-items'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly PaletteItem[]
}

export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const matches = filterCommands(items, query)

  function close() {
    setQuery('')
    onOpenChange(false)
  }

  function runItem(item: PaletteItem) {
    close()
    item.run()
  }

  function optionButtons(): HTMLButtonElement[] {
    return Array.from(list.current?.querySelectorAll('button') ?? [])
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowDown') return
    event.preventDefault()
    optionButtons()[0]?.focus()
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = optionButtons()
    const index = buttons.findIndex((button) => button === document.activeElement)
    if (event.key === 'ArrowUp' && index <= 0) {
      input.current?.focus()
      return
    }
    buttons[event.key === 'ArrowDown' ? index + 1 : index - 1]?.focus()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true)
        else close()
      }}
    >
      <DialogContent className="top-[18%] -translate-y-0 gap-3 p-4" showCloseButton={false}>
        <DialogTitle className="sr-only">Commands</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to a lesson or run an action.
        </DialogDescription>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const first = matches[0]
            if (first) runItem(first)
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={input}
            autoFocus
            aria-label="Search commands"
            placeholder="Type a lesson or command"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            className="pl-9"
          />
        </form>
        <div ref={list} onKeyDown={onListKeyDown} className="max-h-80 overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No command matches “{query}”.</p>
          ) : (
            groupCommands(matches).map((group) => (
              <section key={group.name} aria-label={group.name} className="py-1">
                <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  {group.name}
                </h3>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => runItem(item)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus-visible:-outline-offset-2 focus-visible:bg-accent"
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.shortcut ? (
                          <span className="flex shrink-0 items-center gap-1">
                            {item.shortcut.map((key) => (
                              <Kbd key={key}>{key}</Kbd>
                            ))}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <p className="flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            run first match
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd>
            close
          </span>
        </p>
      </DialogContent>
    </Dialog>
  )
}
