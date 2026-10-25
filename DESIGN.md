# DESIGN.md — Replo design system

Source of truth for UI decisions across `apps/landing` and `apps/product`. Tokens are implemented in [`packages/ui/src/styles/tokens.css`](./packages/ui/src/styles/tokens.css); components in `packages/ui` (primitives only) and `apps/product/src/features/*` (composites). Blueprint reference: §4.2, §10.

## 1. Design principles

1. **Reading first.** The learning player is the product. Optimise for long, calm reading with code beside it; chrome recedes.
2. **Verifiable by default.** Trust is visible: every claim shows where it came from; _observed_ vs _interpretation_ is a first-class visual distinction, not a footnote.
3. **Code-forward.** Source is never a screenshot or an afterthought. Pinned, highlighted, linkable, keyboard-reachable.
4. **Honest states.** Loading, failure, key, draft and staleness are designed, specific and actionable ("Your key was rejected — check it in Settings → API keys").
5. **Quietly distinctive.** A warm "paper and ink" reading surface, one confident accent, semantic colour only where it carries meaning. No decorative gradients or stock AI-startup aesthetics.
6. **Accessible and fast.** Keyboard-complete, reduced-motion aware, contrast-checked in both themes, heavy widgets lazy-loaded.

## 2. Colour tokens

OKLCH, light + dark, defined as CSS variables and exposed to Tailwind v4 via `@theme inline`. **Never hard-code colours in components.**

| Token                        | Light                                           | Dark                                             | Use                                     |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| `background`                 | `oklch(0.985 0.006 85)` warm paper              | `oklch(0.18 0.015 265)`                          | Page                                    |
| `foreground`                 | `oklch(0.22 0.02 265)` ink                      | `oklch(0.95 0.008 85)`                           | Text                                    |
| `card`                       | `oklch(1 0 0)`                                  | `oklch(0.21 0.017 265)`                          | Panels                                  |
| `muted` / `muted-foreground` | `oklch(0.955 0.008 85)` / `oklch(0.5 0.02 265)` | `oklch(0.25 0.017 265)` / `oklch(0.7 0.015 265)` | Secondary surfaces/text                 |
| `border` / `input`           | `oklch(0.9 0.01 85)`                            | `oklch(0.3 0.02 265)`                            | Hairlines                               |
| `primary`                    | `oklch(0.42 0.14 265)` ink-blue                 | `oklch(0.78 0.11 265)`                           | Primary action, links, focus accent     |
| `accent`                     | `oklch(0.94 0.03 265)`                          | `oklch(0.28 0.04 265)`                           | Hover/selected tint                     |
| `ring`                       | `oklch(0.55 0.15 265)`                          | `oklch(0.7 0.13 265)`                            | Focus ring                              |
| `observed`                   | `oklch(0.55 0.13 155)` green                    | `oklch(0.75 0.14 155)`                           | Verified/observed claims, resolved refs |
| `interpretation`             | `oklch(0.7 0.14 75)` amber                      | `oklch(0.8 0.13 75)`                             | Interpretation, draft, caution          |
| `destructive`                | `oklch(0.55 0.2 27)`                            | `oklch(0.7 0.19 27)`                             | Errors, delete                          |
| `code-bg` / `code-highlight` | `oklch(0.97 0.008 85)` / `oklch(0.93 0.07 95)`  | `oklch(0.16 0.015 265)` / `oklch(0.3 0.06 95)`   | Source panel, cited range               |

Semantic rule: **green = verified fact, amber = judgment/uncertainty, red = failure.** Never use these three for decoration.

## 3. Typography

| Role              | Font                   | Notes                                                                       |
| ----------------- | ---------------------- | --------------------------------------------------------------------------- |
| UI / sans         | **Geist**              | Interface text, nav, forms                                                  |
| Reading / display | **Newsreader** (serif) | Lesson prose, landing headlines. Gives the reading surface a book-like calm |
| Code              | **Geist Mono**         | Source panel, inline code, diagrams text fallback                           |

Loaded with `next/font/google` (self-hosted at build). Scale (rem): `xs .75 · sm .875 · base 1 · lg 1.125 · xl 1.25 · 2xl 1.5 · 3xl 1.875 · 4xl 2.25 · 5xl 3 · 6xl 3.75`. Lesson prose: serif `1.125rem/1.75`, measure **≤ 68ch**. Code: `0.8125–0.875rem/1.6`, tabular numerals for line numbers. Landing display: tight tracking (`-0.02em`), weight 500–600.

## 4. Spacing, radius, elevation, motion

- **Spacing:** 4px base (Tailwind scale). Page gutter 16px mobile / 24px tablet / 32px desktop. Content max-width 1200px; reading column 68ch.
- **Radius:** `--radius: 0.5rem` (sm = −2px, md = −0px, lg = +2px, xl = +6px). Source panel and cards `lg`; inputs/buttons `md`.
- **Elevation:** prefer **borders over shadows**. One soft shadow tier for popovers/dialogs only.
- **Motion:** 120–200ms ease-out for hover/focus/panel transitions; no motion on content reflow; `prefers-reduced-motion` disables non-essential animation. Progress stage changes animate with opacity only.

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

| Screen                 | Layout notes                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard `/`          | In-progress tutorials (resume), recent imports, prominent import CTA, key status with the OpenRouter recommendation                                                       |
| Import `/import`       | Stepper: URL/repo → pre-flight result → audience + **key** + preset → **estimate card** (model, requests/tokens, cost, ceiling) → start |
| Job `/jobs/:id`        | Vertical stage list with live status, elapsed time, cancel, failure reason and error code                                             |
| Overview `/t/…`        | Architecture diagram hero, objectives, outline with durations, version picker, share, banners                                                  |
| Settings `/settings/*` | Left sub-nav: profile · github · keys · models. Keys shown only as `…last4`                                                          |
| Landing `/`            | Hero (headline + repo-URL input mock), how-it-works, grounding explainer, free for everyone with your key, FAQ, footer. Static, fast, SEO-complete          |

## 6. Component inventory

**`packages/ui` (primitives + tokens only):** Button · Badge · Card · Input · Label · Select · Tabs · Dialog/Sheet/Drawer · Tooltip · Popover · Command · Resizable · Skeleton · Progress · RadioGroup · Checkbox · Toast · Separator · ScrollArea · `cn()` util. Built on Base UI + `class-variance-authority`.

**`apps/product/src/features` (composites):** `LearningPlayer` · `OutlineTree` · `LessonBlocks` (Prose, Code, Diagram, Callout, Exercise) · `EvidenceChip` · `SourcePanel` · `QuizCard` · `JobStageList` · `KeyPicker` · `EstimateCard` · `ModelPresetPicker` · `KeyManager` · `StaleBanner` · `DraftBanner`.

### Claim styling (signature element)

| Kind                             | Treatment                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `observed`                       | Normal prose; trailing **evidence chips** (`file.ts:L18–22`) with a `observed`-green dot; chip click opens source range             |
| `interpretation`                 | Left border in `interpretation` amber, subtle tinted background, label "Interpretation — not confirmed by the code"; chips optional |
| Unresolved ref (should not ship) | `destructive` chip with strikethrough; only visible in dev/admin                                                                    |
| Draft tutorial                   | Persistent amber banner: "Draft — lower confidence. Some claims could not be fully verified."                                       |

## 7. States and content patterns

| State     | Pattern                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading   | Skeletons matching final layout; no spinners over content areas                                                                                                              |
| Empty     | One-line explanation + single primary action                                                                                                                                 |
| Error     | What happened · which stage/limit · what to do next · retry. Typed error codes map to copy (`REPO_TOO_LARGE`, `KEY_INVALID`, `FREE_PRESET_REQUIRES_OPENROUTER`, `KEY_REMOVED`…) |
| Budget    | Show the job’s budget ceiling and what it has spent; offer a higher ceiling or a cheaper preset inline |
| Staleness | "Repo changed since this tutorial" banner with link to regenerate (V)                                                                                                        |
| Success   | Quiet inline confirmation; avoid celebratory modals                                                                                                                          |

Voice: plain, specific, developer-to-developer. No hype, no emoji in product UI. Say "your key", "your model", "your bill". Never say "credits", "top-up" or "free pool".

## 8. Accessibility checklist (must pass before a screen ships)

- [ ] Full keyboard path; visible `focus-visible` ring using `ring` token (3:1 against adjacent colours)
- [ ] Text contrast ≥ 4.5:1 (3:1 large) in **both** themes
- [ ] Code blocks focusable, announce file + line range; line numbers `aria-hidden`
- [ ] Diagrams: caption + ordered text "steps" list alternative
- [ ] Quiz = real radio group with fieldset/legend; results announced via `aria-live`
- [ ] Reduced motion honoured; no auto-playing animation
- [ ] Touch targets ≥ 40px on mobile; layout works from 320px, no horizontal page scroll
- [ ] Dark mode follows `prefers-color-scheme`, user override persisted

## 9. Third-party UI rules

No ads, ever (ADR-007). No third-party ad, tracking or embed scripts on any page. Anything new needs a reason recorded in `MEM.md` first.

## 10. Brand placeholders (to finalise)

Name: **Replo**. Logo, favicon and OG-image templates are TBD — placeholders live in `apps/*/public`. Open Graph images are generated **only for public tutorials**.
