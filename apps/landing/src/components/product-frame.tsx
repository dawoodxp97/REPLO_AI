import { cn, CodePanel, CodePanelHeader, MonoLabel } from '@replo/ui'
import { BookOpen, FileCode2, GitCommitHorizontal } from 'lucide-react'
import { Fragment } from 'react'
import { CitationChip, CitationLink } from './citation-chip'

const PINNED_SHA = '3b17b2e'

const SOURCE_PATH = ['src', 'cart', 'thunks.ts'] as const

const HIGHLIGHT = { from: 9, to: 27 } as const

const SOURCE_LINES = [
  "import { createAsyncThunk } from '@reduxjs/toolkit'",
  "import { cartApi } from '../api/cart'",
  "import type { RootState } from '../store'",
  "import { itemAdded, itemRolledBack } from './slice'",
  '',
  'type AddItemArgs = { productId: string; quantity: number }',
  'const MAX_QUANTITY = 99',
  '',
  'export const addItem = createAsyncThunk(',
  "  'cart/addItem',",
  '  async ({ productId, quantity }: AddItemArgs, { dispatch, getState }) => {',
  '    const { cart } = getState() as RootState',
  '    const previous = cart.items[productId]?.quantity ?? 0',
  '    const next = Math.min(previous + quantity, MAX_QUANTITY)',
  '    dispatch(itemAdded({ productId, quantity: next }))',
  '',
  '    try {',
  '      return await cartApi.setLine(cart.id, { productId, quantity: next })',
  '    } catch (error) {',
  '      dispatch(itemRolledBack({ productId, quantity: previous }))',
  '      throw error',
  '    }',
  '  },',
  '  {',
  '    condition: (_, { getState }) => !(getState() as RootState).cart.locked,',
  '  },',
  ')',
  '',
  "export const clearCart = createAsyncThunk('cart/clear', (cartId: string) =>",
  '  cartApi.clear(cartId),',
  ')',
] as const

const TOKEN_PATTERN =
  /('[^']*'|\b(?:import|from|export|const|type|async|await|return|try|catch|throw|as)\b)/g

function SourceLine({ text }: { text: string }) {
  return text.split(TOKEN_PATTERN).map((part, index) => {
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>
    return (
      <span
        key={index}
        className={part.startsWith("'") ? 'text-muted-foreground' : 'font-medium text-foreground'}
      >
        {part}
      </span>
    )
  })
}

function SourceViewer() {
  return (
    <CodePanel embedded className="flex min-w-0 flex-col font-sans">
      <CodePanelHeader>
        <p className="min-w-0 truncate font-mono text-xs">
          {SOURCE_PATH.map((segment, index) => (
            <Fragment key={segment}>
              {index > 0 ? <span className="px-1 text-muted-foreground">/</span> : null}
              <span
                className={
                  index === SOURCE_PATH.length - 1 ? 'text-foreground' : 'text-muted-foreground'
                }
              >
                {segment}
              </span>
            </Fragment>
          ))}
        </p>
        <MonoLabel className="flex shrink-0 items-center gap-1.5">
          <GitCommitHorizontal className="size-3.5" aria-hidden="true" />
          pinned @{PINNED_SHA}
        </MonoLabel>
      </CodePanelHeader>
      <div
        tabIndex={0}
        role="region"
        aria-label={`${SOURCE_PATH.join('/')} at commit ${PINNED_SHA}`}
        id="example-source"
        className="scrollbar-thin max-h-96 scroll-mt-24 overflow-auto"
      >
        <pre className="w-max min-w-full py-3 font-mono text-xs leading-6 sm:text-compact">
          <code>
            {SOURCE_LINES.map((text, index) => {
              const lineNumber = index + 1
              const highlighted = lineNumber >= HIGHLIGHT.from && lineNumber <= HIGHLIGHT.to
              return (
                <span
                  key={lineNumber}
                  className={cn(
                    'flex border-l-2 pr-6',
                    highlighted ? 'border-observed bg-code-highlight' : 'border-transparent',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="tabular w-11 shrink-0 pr-4 text-right text-muted-foreground select-none"
                  >
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre text-foreground/85">
                    <SourceLine text={text} />
                  </span>
                </span>
              )
            })}
          </code>
        </pre>
      </div>
    </CodePanel>
  )
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-sm bg-muted px-1 py-px font-mono text-inline-code text-foreground">
      {children}
    </code>
  )
}

function LessonPane() {
  return (
    <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
      <div className="space-y-1">
        <MonoLabel>Chapter 3 · Lesson 2</MonoLabel>
        <p className="text-sm font-semibold tracking-tight">What happens on “Add to cart”</p>
      </div>
      <div className="prose-lesson space-y-4 text-lesson-sm leading-[1.7]">
        <p>
          The button dispatches the <InlineCode>addItem</InlineCode> thunk instead of calling the
          API directly, so every cart change flows through the store.{' '}
          <CitationChip>src/ui/ProductCard.tsx:L18–22</CitationChip>
        </p>
        <p>
          The thunk writes the new quantity to the store first, then calls{' '}
          <InlineCode>cartApi.setLine</InlineCode>. If the request fails, it dispatches{' '}
          <InlineCode>itemRolledBack</InlineCode> with the previous quantity.{' '}
          <CitationLink
            active
            href="#example-source"
            label="View example source: src/cart/thunks.ts:L9–27"
          >
            src/cart/thunks.ts:L9–27
          </CitationLink>
        </p>
      </div>
      <aside
        aria-label="Interpretation"
        className="border-l-2 border-interpretation bg-interpretation/8 py-3 pr-4 pl-4"
      >
        <p className="flex items-center gap-2 text-xs font-medium">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-interpretation" />
          Interpretation — not confirmed by the code
        </p>
        <p className="prose-lesson mt-1.5 text-base leading-[1.65]">
          Updating the store before the request returns is probably meant to keep the cart
          responsive on slow networks. The code does not say so.
        </p>
      </aside>
    </div>
  )
}

export function ProductFrame() {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span>Example lesson, not a real tutorial</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-observed" />
            Reference resolved by the checker
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-interpretation" />
            Interpretation
          </span>
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3 text-xs">
          <span className="flex items-center gap-2 font-mono">
            <BookOpen className="size-3.5 text-muted-foreground" aria-hidden="true" />
            Example repository / shopping-cart
          </span>
          <span className="text-muted-foreground">Lesson & source</span>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex min-w-0">
            <div className="hidden w-36 shrink-0 border-r bg-muted/20 px-3 py-5 xl:block">
              <p className="mb-4 text-xs font-medium text-muted-foreground">Learning path</p>
              <ol className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <li>01 · Project structure</li>
                <li>02 · The data model</li>
                <li aria-current="step" className="font-medium text-foreground">
                  03 · Cart updates
                </li>
                <li>04 · Checkout</li>
              </ol>
              <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileCode2 className="size-3.5" aria-hidden="true" />
                Source attached
              </p>
            </div>
            <LessonPane />
          </div>
          <div className="min-w-0 border-t lg:border-t-0 lg:border-l">
            <SourceViewer />
          </div>
        </div>
      </div>
    </figure>
  )
}
