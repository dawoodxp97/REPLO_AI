# apps/landing — CLAUDE.md

Marketing site, **static export** (`output: 'export'`) deployed to Cloudflare Pages ($0). Imports `@replo/ui` only (lint enforces; not even `contracts`). Visual rules: `DESIGN.md`.

## Constraints of a static export

No route handlers, no `headers()`/`cookies()`, no ISR, no image optimisation (`images.unoptimized`). Security headers live in `public/_headers` (Cloudflare), not `next.config`. `robots.ts`/`sitemap.ts` use `export const dynamic = 'force-static'`.

## Layout

```
src/app/layout.tsx         fonts (Geist, Geist Mono, Newsreader), metadata, skip link, Header + Footer
src/app/page.tsx           Hero · HowItWorks · Grounding · KeyProviders · Faq
src/app/keys/              key guide (FR-RUN-11): providers, dated :free limits, key handling
src/app/docs/              index · how-it-works/ · grounding/ · keys-and-privacy/ (TSX, no MDX: MEM D-008)
src/app/privacy/           policy pages (FR-SHR-3), each marked as a draft:
src/app/terms/             terms · licence/ (licence and attribution) · takedown/ (reports)
src/app/not-found.tsx      404 page
src/app/robots.ts          robots.txt
src/app/sitemap.ts         sitemap, built from SITE_PATHS in src/lib/routes.ts
src/components/            site.tsx (Header/Footer, APP_URL), sections.tsx (home sections),
                           article.tsx (page shell, Section, DraftNotice, NextLinks)
src/lib/routes.ts          route lists for nav, footer, docs index and sitemap
public/_headers            CSP and caching for Cloudflare Pages
```

## Do / don't

- Links to the product use `NEXT_PUBLIC_APP_URL` (`APP_URL` in `components/site.tsx`). Hash links use `next/link`. Internal pages use `next/link`, not raw `<a>`.
- The hero's lesson preview is the signature element (observed = green evidence chips, interpretation = amber rule). It is labelled as an example. Keep it honest: don't claim features that don't exist yet.
- Policy pages are drafts until reviewed; keep the `DraftNotice` on them until then. Do not invent a company name, address or contact email.
- No ads on this site (ADR-007).
- Check light + dark + 320px width and no horizontal scroll before shipping visual changes.

## Commands

```bash
pnpm --filter @replo/landing dev | build | typecheck | lint     # build output: apps/landing/out
```
