# DESIGN.md — Replo design system

Source of truth for UI decisions across `apps/landing` and `apps/product`. Tokens are implemented in [`packages/ui/src/styles/tokens.css`](./packages/ui/src/styles/tokens.css); components in `packages/ui` (primitives only) and `apps/product/src/features/*` (composites). Blueprint reference: §4.2, §10.

## 1. Design principles

1. **Reading first.** The learning player is the product. Optimise for long, calm reading with code beside it; chrome recedes.
2. **Verifiable by default.** Trust is visible: every claim shows where it came from; _observed_ vs _interpretation_ is a first-class visual distinction, not a footnote.
3. **Code-forward.** Source is never a screenshot or an afterthought. Pinned, highlighted, linkable, keyboard-reachable. Machine data (paths, SHAs, line ranges, money, counts) is set in mono.
4. **Honest states.** Loading, failure, key, draft and staleness are designed, specific and actionable ("Your key was rejected — check it in Settings → API keys").
5. **Colour means something.** The interface is monochrome graphite. The only chromatic colours are semantic: observed green, interpretation amber, destructive red, and link blue. Nothing is coloured for decoration.
6. **Accessible and fast.** Keyboard-complete, reduced-motion aware, contrast-checked in both themes, heavy widgets lazy-loaded.

### Not this

No gradients, glows or blobs; no italic or coloured accent words in headings; no pill "eyebrow" badges above headings; no icons in coloured circles; no generic three-card feature grids; no emoji; no exclamation marks; no uppercase tracked labels except tiny group labels in menus and search; no shadow larger than `shadow-xs` on cards (popovers and dialogs get one soft shadow tier).

## 2. Colour tokens

OKLCH, defined once in [`tokens.css`](./packages/ui/src/styles/tokens.css) with `light-dark()`, exposed to Tailwind v4 via `@theme inline`. The theme follows `color-scheme`: `:root` is `light dark` (follows the OS), and `data-theme="light" | "dark"` on `<html>` pins it. **Never hard-code colours in components.**

| Token                        | Light                      | Dark                      | Use                                      |
| ---------------------------- | -------------------------- | ------------------------- | ---------------------------------------- |
| `background`                 | `oklch(0.992 0.002 250)`   | `oklch(0.165 0.008 260)`  | Page                                     |
| `foreground`                 | `oklch(0.2 0.012 260)` ink | `oklch(0.95 0.004 250)`   | Text                                     |
| `card` / `popover`           | white                      | `oklch(0.19…0.205 …)`     | Panels, overlays                         |
| `muted` / `muted-foreground` | cool grey / `0.52` text    | `0.225` / `0.71` text     | Secondary surfaces / text                |
| `border` / `input`           | hairlines                  | hairlines                 | Borders, control outlines                |
| `primary`                    | graphite                   | near-white                | Primary buttons, selected states         |
| `accent` / `sidebar-accent`  | faint grey                 | faint lift                | Hover and active rows                    |
| `ring` / `link`              | blue `258°`                | lighter blue              | Focus ring; inline links only            |
| `sidebar`                    | slightly darker than page  | slightly darker than page | App sidebar                              |
| `observed`                   | green `158°`               | green                     | Verified claims, resolved refs, success  |
| `interpretation`             | amber `72°`                | amber                     | Interpretation, draft, retrying, caution |
| `destructive`                | red `27°`                  | red                       | Errors, delete                           |
| `code-bg` / `code-highlight` | near-white / green tint    | darker / green tint       | Source panel, cited range                |

Semantic rule: **green = verified fact, amber = judgment/uncertainty, red = failure, blue = link or focus.** Never use them for decoration. The cited range is tinted green because a citation is evidence.

## 3. Typography

| Role           | Font                   | Notes                                                                                   |
| -------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| UI and display | **Geist**              | Everything outside lesson prose. Headings semibold, `tracking-tight`, `text-balance`    |
| Lesson prose   | **Newsreader** (serif) | Only inside the reading column (`prose-lesson` utility): `1.125rem/1.75`, ≤ 68ch        |
| Machine data   | **Geist Mono**         | Paths, SHAs, line ranges, repo slugs, money, counts; `tabular` utility for live numbers |

Named type scale (theme tokens, no arbitrary `text-[...]` sizes): `text-micro` 10px, `text-meta` 11px, `text-compact` 13px, `text-brand` 15px, `text-lesson-sm` 17px, `text-inline-code` 0.875em. Utilities: `heading-display` (`tracking-display` -0.025em, semibold, balance) and `link-inline` for inline anchors.

Loaded with `next/font/google`. Page title `text-2xl` (`PageHeader`), section title `text-base` (`SectionHeader`), body `text-sm`, meta `text-xs`/`0.8125rem`. Landing display sizes use `-0.025em` tracking.

## 4. Spacing, radius, elevation, motion

- **Spacing:** 4px base. Page gutter 16px mobile / 24px tablet / 40px desktop. Content max-width 72rem; reading column 68ch. Page sections `space-y-8`.
- **Panels:** bordered surfaces use `rounded-lg`; `rounded-xl` only for the landing hero frame and dialogs.
- **Shared components:** `BrandMark`/`Brand` (takes a `linkComponent`), `MonoLabel`, `CodePanel` and `CodePanelHeader` live in `@replo/ui`; each app keeps a thin `Brand` wrapper binding `next/link`.
- **Focus:** the global `:focus-visible` outline is the focus style and `Button` adds no ring. Switch, checkbox, radio-group, tabs and the shared input control (`packages/ui/src/lib/control.ts`) still use `ring-[3px]` and are not migrated.
- **Radius:** `--radius: 0.5rem`; `sm` −4px, `md` −2px (buttons, inputs), `lg` (cards, panels), `xl` +4px (dialogs).
- **Elevation:** borders over shadows. Cards `shadow-xs`; popovers, menus and dialogs one soft shadow.
- **Motion:** 120–200ms ease-out; overlays fade and scale from 98% using Base UI's `data-starting-style`/`data-ending-style`; `prefers-reduced-motion` disables non-essential animation.

## 5. Layout

### Learning player (`/t/:owner/:repo/:slug/learn/:chapterKey/:lessonKey`)

```
┌────────────┬─────────────────────────────┬──────────────────────────┐
│ Outline    │ Lesson (serif, ≤68ch)       │ Source (pinned @ SHA)    │
│ (collapsi- │ prose · code · diagram ·    │ Shiki-highlighted file,  │
│  ble tree, │ callout · exercise          │ cited range highlighted  │
│  progress) │ evidence chips ─────────────▶ opens ref here           │
│            │ Quiz (radio group)          │ breadcrumb · Open on GH  │
└────────────┴─────────────────────────────┴──────────────────────────┘
```

shadcn `Resizable` panels, sizes persisted per user. **< 768px:** outline becomes a sheet; source becomes a bottom `Drawer` opened from each code reference.

### Other screens

| Screen                 | Layout notes                                                                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard `/`          | In-progress tutorials (resume), recent imports, prominent import CTA, key status with the OpenRouter recommendation                                                                                               |
| Import `/import`       | Stepper: URL/repo → pre-flight result → audience + **key** + preset → **estimate card** (model, requests/tokens, cost, ceiling) → start                                                                           |
| Job `/jobs/:id`        | Vertical stage list with live status, elapsed time, cancel, failure reason and error code                                                                                                                         |
| Overview `/t/…`        | Architecture diagram hero, objectives, outline with durations, version picker, share, banners                                                                                                                     |
| Settings `/settings/*` | Left sub-nav: profile · github · keys · models. Keys shown only as `…last4`                                                                                                                                       |
| Landing `/`            | Headline + product frame (lesson beside pinned source, the signature), how it works (4-step sequence), how references are checked, your key / your bill, FAQ (native details), footer. Static, fast, SEO-complete |

## 6. Component inventory

**`packages/ui` (shadcn-style primitives + tokens only, Base UI underneath):** Button · Badge · Card (Header, Title, Description, Action, Content, Footer) · Alert (Title, Description) · Input · Textarea · NativeSelect · Checkbox · Switch · RadioGroup · Label · Field (Set, Legend, Group, Label, Description, Error) + FormField · Dialog · AlertDialog · Sheet · Popover · DropdownMenu · Tooltip · Tabs · Collapsible · Skeleton · Spinner · Progress · Separator · Avatar · Kbd · Table · Empty · Item (Group, Media, Content, Title, Description, Actions) · Breadcrumb · `cn()`.

Form controls (checkbox, radio, switch, select, progress) are **native elements styled with Tailwind**: they render without JavaScript on SSR pages and never emit inline `style` attributes, which the nonce CSP blocks (D-068). Overlays (dialog, sheet, menu, popover, tooltip) use Base UI; they render only on the client.

**`apps/product/src/components` (shared composites):** AppShell (sidebar, header, user menu with System/Light/Dark theme), Brand, PageHeader + SectionHeader, LinkButton, QueryBoundary, ErrorPanel, LoadMore, ConfirmDialog, RadioCardGroup, Sheet, SafeMarkdown, CopyLinkButton.

**`apps/product/src/features` (feature composites):** `LessonScreen` · `OutlineNav` · `LessonBlocks` · evidence chips · `SourceView` · `QuizSection` · job stage timeline · `KeyField` · `EstimateCard` · `PresetField` · keys section · banners · `JobStatusBadge`.

### Claim styling (signature element)

| Kind                             | Treatment                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `observed`                       | Normal prose; trailing **evidence chips** (`file.ts:L18–22`) with a `observed`-green dot; chip click opens source range             |
| `interpretation`                 | Left border in `interpretation` amber, subtle tinted background, label "Interpretation — not confirmed by the code"; chips optional |
| Unresolved ref (should not ship) | `destructive` chip with strikethrough; only visible in dev/admin                                                                    |
| Draft tutorial                   | Persistent amber banner: "Draft — lower confidence. Some claims could not be fully verified."                                       |

## 7. States and content patterns

| State     | Pattern                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading   | Skeletons matching final layout; no spinners over content areas                                                                                                                 |
| Empty     | One-line explanation + single primary action                                                                                                                                    |
| Error     | What happened · which stage/limit · what to do next · retry. Typed error codes map to copy (`REPO_TOO_LARGE`, `KEY_INVALID`, `FREE_PRESET_REQUIRES_OPENROUTER`, `KEY_REMOVED`…) |
| Budget    | Show the job’s budget ceiling and what it has spent; offer a higher ceiling or a cheaper preset inline                                                                          |
| Staleness | "Repo changed since this tutorial" banner with link to regenerate (V)                                                                                                           |
| Success   | Quiet inline confirmation; avoid celebratory modals                                                                                                                             |

Voice: plain, specific, developer-to-developer. No hype, no emoji in product UI. Say "your key", "your model", "your bill". Never say "credits", "top-up" or "free pool".

## 8. Accessibility checklist (must pass before a screen ships)

- [ ] Full keyboard path; visible `focus-visible` ring using `ring` token (3:1 against adjacent colours)
- [ ] Text contrast ≥ 4.5:1 (3:1 large) in **both** themes
- [ ] Code blocks focusable, announce file + line range; line numbers `aria-hidden`
- [ ] Diagrams: caption + ordered text "steps" list alternative
- [ ] Quiz = real radio group with fieldset/legend; results announced via `aria-live`
- [ ] Reduced motion honoured; no auto-playing animation
- [ ] Touch targets ≥ 40px on mobile; layout works from 320px, no horizontal page scroll
- [ ] Theme defaults to System (follows `prefers-color-scheme`); a Light or Dark choice is saved in preferences and applied as `data-theme`

## 9. Third-party UI rules

No ads, ever (ADR-007). No third-party ad, tracking or embed scripts on any page. Anything new needs a reason recorded in `MEM.md` first.

## 10. Brand placeholders (to finalise)

Name: **Replo**. Logo, favicon and OG-image templates are TBD — placeholders live in `apps/*/public`. Open Graph images are generated **only for public tutorials**.
