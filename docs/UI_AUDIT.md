# UI/UX audit — 9 November 2026

Baseline for the UI/UX refactor. Every finding below was observed in a running build or confirmed in code; nothing here is fixed yet. Rules it is measured against: `DESIGN.md` (§1 principles, §8 accessibility checklist) and `RULES.md` §5.

## Method

- 18 routes (17 product screens with the recorded fixtures from `apps/product/e2e/fixtures`, plus the landing page) × 4 modes: desktop 1440×900 dark and light, phone 375×812 dark and light. 72 page loads.
- Per load: axe-core (WCAG 2.0/2.1 A and AA plus best practice), horizontal overflow, interactive elements below the size floor (40 px on phones, 24 px on desktop), heading structure, landmarks, text under 12 px, console errors, and a 12-step keyboard walk checking for a visible focus indicator.
- Screens read by eye in both themes and on a phone; suspicious results traced to source.
- Product ran on the dev server against the mock API, so performance numbers are not meaningful and were not judged.

## What already works

- No horizontal scroll at 375 px on any screen.
- Skip link, `<main>` on 16 of 18 pages, reduced-motion handling, a command palette and keyboard shortcuts in the player.
- Honest, specific copy; the empty Home for a new account (key → repository → reading) is clear.
- The reading column (serif, ≤ 68ch) and the observed/interpretation styling read well in both themes.

## Findings

Severity: **P0** wrong behaviour or a failed accessibility rule; **P1** large UX cost on a core flow; **P2** polish.

### P0 — bugs and accessibility failures

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                                                          | Fix                                                                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The custom type scale is silently dropped.** `cn()` is plain `twMerge`, which does not know `text-micro`, `text-meta`, `text-compact`, `text-brand`, `text-lesson-sm` or `text-inline-code`. It reads them as text colours and removes them when a real colour such as `text-muted-foreground` follows. Every field hint therefore renders at 16 px, larger than its 14 px label, across Import, Settings and the report form. | `packages/ui/src/lib/cn.ts`; `FieldDescription` (`packages/ui/src/components/field.tsx:47`) renders without `text-compact`, computed 16 px. About 25 call sites use these tokens. | `extendTailwindMerge` registering the scale as font sizes, plus a unit test that `cn('text-compact', 'text-muted-foreground')` keeps both.                                                     |
| 2   | **The saved theme is ignored outside the signed-in shell.** `ThemeSync` is mounted only in `app/(app)/layout.tsx`. The player, tutorial overview, source explorer, progress and sign-in pages follow the OS instead. With Dark saved and a light OS, Home is dark and Resume opens a light player. The shell also applies the theme after `settings.get` resolves, so every full load can flash the wrong theme.                 | `features/session/theme-sync.tsx`, `use-theme-preference.ts`; `data-theme` absent on all tutorial routes in the sweep.                                                            | Apply the preference on every route for signed-in readers, and set `data-theme` on `<html>` during SSR from a cookie so the first paint is right.                                              |
| 3   | **Heading levels skip on 8 screens.** `CardTitle` hard-codes `<h3>`; most pages have an `<h1>` and no `<h2>`.                                                                                                                                                                                                                                                                                                                    | axe `heading-order`: home, import, job, lesson, progress, settings profile/preferences/models. `packages/ui/src/components/card.tsx:28`.                                          | `CardTitle` renders `<h2>` by default with an `as` override; check the few cards that sit under a section heading.                                                                             |
| 4   | **Contrast failures in code and diagrams.** Light theme: Shiki tokens on the green cited-range tint (5 nodes per lesson). Landing: line numbers on highlighted rows (13 nodes). Dark: the Mermaid edge-label box (“dispatches”) on the overview.                                                                                                                                                                                 | axe `color-contrast` on lesson (light), landing (both), overview (dark).                                                                                                          | Darken the light `code-highlight` tint or switch the highlighted row to a left rule plus faint tint; lift line-number colour on highlighted rows; transparent edge-label background (see #11). |
| 5   | **Missing landmarks.** `/code` has no `<main>`; the player’s empty source panel sits outside any landmark.                                                                                                                                                                                                                                                                                                                       | axe `landmark-one-main`, `region` on code and lesson.                                                                                                                             | Wrap the explorer in `<main>`; make the source column an `<aside aria-label="Source">`.                                                                                                        |
| 6   | **Focus not visible on some controls.** Tutorial outline rows use `outline-none focus-visible:bg-accent`, a faint grey lift, not the ring `DESIGN.md` §8 requires. On sign-in, a focusable container around the tabs shows no indicator.                                                                                                                                                                                         | Keyboard walk: 3 outline rows on the overview, 1 container on login. `features/tutorials/tutorial-outline.tsx:49`.                                                                | Drop `outline-none` so the global `:focus-visible` outline applies; remove the stray `tabIndex` on the login container.                                                                        |
| 7   | **Touch targets under the 40 px floor `DESIGN.md` sets.** Phone header: navigation 32×32, notifications 36×36, search 36 px. Settings sub-nav 32 px, sign-in tabs 28 px, default `Button` and `Input` 36 px, “Show a hint” 20 px, landing nav 20 px.                                                                                                                                                                             | 5–19 undersized targets per phone screen.                                                                                                                                         | Size controls by pointer in the UI kit (`pointer-coarse:h-10`, `size-10`) for Button, Input, NativeSelect, tabs and nav rows, so desktop density is unchanged.                                 |
| 8   | **Inputs are 14 px on phones**, so iOS Safari zooms the page on focus.                                                                                                                                                                                                                                                                                                                                                           | `packages/ui/src/lib/control.ts` uses `text-sm` at every width.                                                                                                                   | `text-base md:text-sm`.                                                                                                                                                                        |

### P1 — core-flow UX

| #   | Finding                                                                                                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | **The source panel starts empty.** In the player a third of the screen says “No source selected” until a chip is clicked; `/code` says “No file selected”. For a code-forward product the first view of a lesson should already show code.                                                                                                           | Open the lesson’s first cited range when the lesson loads (and on lesson change); open the first cited file in the explorer. Later: follow the reader, highlighting the range for the paragraph in view. |
| 10  | **Diagrams ignore the design system.** Mermaid’s default theme adds drop shadows to nodes and a grey box behind edge labels; `DESIGN.md` §1 bans glows and shadows above `shadow-xs`.                                                                                                                                                                | Theme Mermaid from the tokens: hairline borders, card fill, no shadow, transparent label background, Geist. This is also the base for the archify-style diagram types.                                   |
| 11  | **The job page lacks context.** The title is “Tutorial generation” and never names the repository, preset or audience. Money shows four decimals (`$0.0000 of $2.00`). The bar has no “stage 2 of 8”, and stages show no elapsed time (promised in `DESIGN.md` §5). “Cancel generation” sits as a neutral button between the summary and the stages. | Header “Generating acme/widgets” with preset · audience · commit; cents; stage n of 8 and per-stage elapsed time; move Cancel into the summary card with a confirmation.                                 |
| 12  | **Job pages are filed under Repositories.** Sidebar and breadcrumb show Repositories (`nav-items.ts:20` maps `/jobs` there), but the user started the job from New tutorial and the result lands in Library.                                                                                                                                         | Show jobs under Library, with the breadcrumb `Library / Generating acme/widgets`.                                                                                                                        |
| 13  | **Home spends its space on counts.** Two primary “New tutorial” buttons are visible at once (sidebar and header). The stat band mixes status and visibility (Tutorials, Drafts, Private, Link, Public); “Link” is unclear; on a phone the five tiles fill the first screen.                                                                          | One primary action. Collapse the counts into a single quiet line or drop the visibility split; lead with Continue reading, then running jobs, then recent tutorials with progress.                       |
| 14  | **The import form hides why it can’t start.** Four stacked sections end in a disabled “Generate tutorial” with no reason. The four presets sit in a 3-column grid, orphaning “Quality”. “:free models” is jargon.                                                                                                                                    | 2×2 (or 4-column) preset grid; a sticky footer with the estimate, Generate, and the missing step (“Check the repository first”); plain copy for the free preset.                                         |
| 15  | **The phone header is crowded.** The search field is squeezed to “Search your lit…” and still shows a ⌘K hint. The lesson ends with a keyboard-shortcut legend on touch devices.                                                                                                                                                                     | Below `sm`, search becomes an icon button opening the existing dialog; hide keyboard hints on `pointer: coarse`.                                                                                         |
| 16  | **The source explorer is a dead end.** `/code` has no top bar or brand, unlike the overview; the only way out is “Back to the tutorial”.                                                                                                                                                                                                             | Reuse the tutorial top bar (brand, tutorial title, Open app) on `/code` and `/progress`.                                                                                                                 |

### P2 — polish

| #   | Finding                                                                                                                                            | Fix                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 17  | Breadcrumbs on top-level pages (“Workspace / Home”) add nothing.                                                                                   | Show breadcrumbs only two levels down (Settings / API keys, Library / tutorial).            |
| 18  | Destructive actions look like ordinary ones: Library “Delete” and Settings key “Delete” are neutral outline buttons beside normal actions.         | Library: move Delete into a row menu. Keys: destructive variant, kept apart from Check key. |
| 19  | Overview badges mix casing (“intermediate”, “public”, “Version 2”); the public link wraps mid-word.                                                | Sentence case; truncate the link and rely on Copy link.                                     |
| 20  | After finishing a lesson the button reads “Mark as not complete”.                                                                                  | A “Completed” toggle with a check, undo by pressing again.                                  |
| 21  | Landing: the provider table wraps its Notes column word by word on phones; the product frame’s code list scrolls sideways but can’t be focused.    | Stack the table on phones; `tabIndex={0}` and a label on the scroll region.                 |
| 22  | Test fixtures: the mock API has no `/notifications/stream`, so mock mode logs a 404 on every signed-in page and the job page shows “Reconnecting”. | Serve an idle event stream from `e2e/support/mock-api.ts`.                                  |

## Proposed order

Each slice is one reviewable change with its own tests and a re-run of this sweep.

1. **Foundations** (`packages/ui`, session): #1, #3, #6, #7, #8, #2. Small edits with the widest reach; most later screens improve without touching them.
2. **Player and source**: #9, #10, #4, #5, #15, #16, #20.
3. **Workspace flows**: #11, #12, #13, #14, #17, #18.
4. **Public pages and landing**: #19, #21.
5. **Guard rails**: #22, extend `e2e/accessibility.spec.ts` from 7 routes to all of them on desktop and phone, and add the touch-target check from this sweep.

## Status

### Slice 1 — foundations (9 November 2026)

Fixed: #1 (tailwind-merge knows the type scale), #2 (theme cookie applied during SSR on every route, MEM D-103), #3 (`CardTitle` is an `<h2>`, `as="h3"` under a section heading), #6 (inset outline on list rows, focusable tab panel shows the outline), #7 (`pointer-coarse:` 40 px sizes in the UI kit, settings nav, hint toggle, brand link), #8 (16 px control text below `md`).

Re-run of the sweep, before → after:

| Check                                           | Before | After |
| ----------------------------------------------- | -----: | ----: |
| axe `heading-order` (page × mode)               |     32 |     0 |
| Undersized targets, phone (both themes)         |    354 |   100 |
| Focus stops with no visible indicator (desktop) |      7 |     1 |
| Field hint size                                 |  16 px | 13 px |
| Lesson theme with Light saved on a dark OS      |   dark | light |

Remaining phone targets are the visually hidden skip link (a false positive), native radios inside clickable cards, preference switches, evidence chips and source-tree rows; the last two belong to slice 2. The remaining focus stop is the player's 1 px resize handle, which turns blue on focus and is widened in slice 2. Contrast (#4) and landmarks (#5) are unchanged and move to slice 2 with the player.

### Slice 2 — player and source (9 November 2026)

Fixed: #9 (the source column shows the lesson's first resolvable reference on desktop and marks its chip; `/code` opens the first cited file or the root README), #10 (Mermaid `look: 'classic'` plus token `themeCSS`: no shadow or gradient, hairline outline, labels on the card colour, page font), #4 (Shiki `github-light-high-contrast` / `github-dark-default`, `code-highlight` retuned so every token clears 4.5:1; landing line numbers at full muted colour), #5 (`/code` inside `TutorialShell` with `<main>`; player source column is `<aside aria-label="Source">`), #15 (phone header search is an icon that expands to a full-width field; ⌘K badge and lesson shortcut legend hidden on touch), #16 (`/code` has the tutorial top bar), #20 (completed lessons show a pressed “Completed” toggle). Also: the resize handle shows a 9 px tinted bar on focus, evidence chips and source-tree rows are 40 px on touch, and the landing checker report's scroll region is focusable.

| Check (page × mode, 72 loads)           | Baseline | Slice 1 | Slice 2 |
| --------------------------------------- | -------: | ------: | ------: |
| axe `color-contrast`                    |        8 |       8 |   0 (1) |
| axe `heading-order`                     |       32 |       0 |       0 |
| axe `landmark-one-main` + `region`      |       10 |      10 |       0 |
| axe `scrollable-region-focusable`       |        2 |       2 |   0 (1) |
| Undersized targets, phone (both themes) |      354 |     100 |      84 |

(1) Landing re-checked on its own after the fix: no violations in dark or light at 1440 and 375 px.

Remaining phone targets: the visually hidden skip link (false positive), native radios inside clickable cards, preference switches, inline text links, and landing nav links that are 40 px tall but narrower than 40 px.

### Slice 3 — workspace flows (9 November 2026)

Fixed: #11 (job page titled with the repository, preset and audience from three new `GenerationJobDto` fields; spend in cents; “Stage n of 8” above the progress bar; Cancel inside the summary card behind a confirmation), #12 (jobs filed under Library), #13 (one primary “New tutorial” per screen: the header copy shows only below `md`; counts are one quiet line with empty groups hidden), #14 (presets in a 2-column grid; a sticky start bar names the first missing step; plain copy for the free preset), #17 (breadcrumbs only on nested routes: Settings / section, Library / Generation), #18 (`destructive-outline` trigger for every `ConfirmDialog`, including repository Remove).

| Check (page × mode, 72 loads)           | Baseline | Slice 1 | Slice 2 | Slice 3 |
| --------------------------------------- | -------: | ------: | ------: | ------: |
| axe violations, all rules               |       52 |      14 |       4 |       0 |
| Undersized targets, phone (both themes) |      354 |     100 |      84 |      84 |

The full sweep now reports no axe violations on any of the 18 routes in any mode. Remaining open items: #19, #21 (slice 4) and #22 plus the wider accessibility e2e (slice 5).

### Slices 4 and 5 — public pages and guard rails (9 November 2026)

Fixed: #19 (overview badges use the shared audience and visibility labels; the `link` visibility reads “Shared by link” everywhere; the public link truncates on one line beside Copy link), #21 (provider table stacks the Recommended badge under the name on phones), #22 (the mock API holds `/notifications/stream` and `/jobs/:id/events` open as idle streams). Also: preference switches get a padded 40 px label, and “Open on GitHub”, Library row titles and progress lesson links are 40 px tall on touch.

Guard rails: `e2e/accessibility.spec.ts` now runs all 16 product routes in light and dark on desktop and phone, fails on any axe violation (WCAG 2.0/2.1 A and AA plus best practice, every impact), and on the phone project fails on any control under 40 px (`e2e/support/touch-targets.ts`). Playwright: 190 tests, 173 passed, 17 skipped by design.

| Check (page × mode, 72 loads)                      | Baseline | Slice 1 | Slice 2 | Slice 3 | Slices 4–5 |
| -------------------------------------------------- | -------: | ------: | ------: | ------: | ---------: |
| axe violations, all rules                          |       52 |      14 |       4 |       0 |          0 |
| Undersized targets, phone (raw count, both themes) |      354 |     100 |      84 |      84 |         50 |
| Console errors in mock mode                        |       52 |      52 |      52 |      52 |          0 |
| Pages with horizontal scroll                       |        0 |       0 |       0 |       0 |          0 |

The 50 remaining raw phone hits are the visually hidden skip link and native radios and switches that sit inside 40 px labels; the e2e touch check, which accounts for those, reports none. The landing page was re-checked on its own after the sweep (its dev server had been stopped): no violations in either theme at 1440 or 375 px.

All 22 findings are addressed.
