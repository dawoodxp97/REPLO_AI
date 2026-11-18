# apps/landing — CLAUDE.md

Marketing site, **static export** (`output: 'export'`) deployed to Cloudflare Pages ($0). Imports `@replo/ui` only (lint enforces; not even `contracts`). Visual rules: `DESIGN.md`.

## Constraints of a static export

No route handlers, no `headers()`/`cookies()`, no ISR, no image optimisation (`images.unoptimized`). Security headers live in `public/_headers` (Cloudflare), not `next.config`. `robots.ts`/`sitemap.ts` use `export const dynamic = 'force-static'`.

## Layout

```
src/app/layout.tsx         fonts (Geist, Geist Mono, Newsreader), metadata, skip link, Header + Footer
src/app/page.tsx           Hero · Product · Graph · Diagrams · HowItWorks · Grounding · KeyProviders · Faq · ClosingCta
src/app/keys/              key guide: providers, dated :free limits, key handling, run limits
src/app/docs/              index · how-it-works/ · grounding/ · keys-and-privacy/ (TSX, no MDX: MEM D-008)
src/app/privacy/           privacy policy, marked as a draft
src/app/terms/             terms of use, marked as a draft
src/app/licence/           licence and attribution, marked as a draft
src/app/not-found.tsx      404 page
src/app/robots.ts          robots.txt
src/app/sitemap.ts         sitemap, built from SITE_PATHS in src/lib/routes.ts
src/components/            site.tsx (Header/Footer, APP_URL), sections/* (home sections),
                           graph-preview.tsx (the one schematic), provider-table.tsx, check-list.tsx,
                           brand.tsx (mark), page-section.tsx (Container, PageSection, MonoLabel),
                           article.tsx (page shell, Section, DraftNotice, NextLinks)
src/lib/content.tsx        all home copy, checks, diagram families, pipeline stages and FAQ
src/lib/providers.tsx      provider rows and the :free tag
src/lib/routes.ts          named pages and route lists for nav, footer, docs index and sitemap
public/_headers            CSP and caching for Cloudflare Pages
```

## Do / don't

- Links to the product use `NEXT_PUBLIC_APP_URL` (`APP_URL` in `components/site.tsx`). Hash links use `next/link`. Internal pages use `next/link`, not raw `<a>`.
- The hero's graph schematic is the signature element. It is labelled as a schematic and carries no repository data. There is no demo course, embedded player, live data or API call (MEM D-122).
- Keep copy in `lib/content.tsx`; add a home section by adding copy there and a component under `components/sections/`.
- Policy pages are drafts until reviewed; keep the `DraftNotice` on them until then. Do not invent a company name, address or contact email.
- No ads on this site (ADR-007).
- Check light + dark + 320px width and no horizontal page scroll before shipping visual changes.

## Commands

```bash
pnpm --filter @replo/landing dev | build | typecheck | lint     # build output: apps/landing/out
```
