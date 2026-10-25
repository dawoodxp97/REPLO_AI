# AI Code Tutorial Generator — Research & Technical Blueprint

Oct 14, 2026 · @Dawood

## 1. Executive summary

**Build it as a free-first tool for individual developers, not a team SaaS.** Developers spend about 58% of their time understanding code, and Cognition's DeepWiki and Google's Code Wiki already give away AI wikis for public repos. The product wins on a **sequenced, verifiably grounded learning path** and on letting each developer decide the model and who pays: **their own API key (BYOK), a daily free allowance on OpenRouter's free models, or small prepaid credits sold near cost**. Ads on public tutorial pages only offset AI cost. Release 1 is TypeScript/JavaScript only, individual accounts only, and runs on one small server.

| Layer | Recommendation | Why, in one line (full reasoning in 4.6) |
| --- | --- | --- |
| Monorepo | pnpm 11 + Turborepo; 3 apps + `contracts`, `ui`, `ai`, `repo-analysis`, `config` + `tools/evals` | One language, shared contracts, cached builds |
| Frontends | Next.js 16 (landing as static export, product as a Node server) + shadcn/ui on Base UI + Tailwind v4 | Free static hosting for landing; SSR for public tutorial pages |
| Backend | Fastify 5 + oRPC + Zod 4 + Better Auth (GitHub sign-in); API and worker processes | Mature, typed, Node-native; frontend imports contracts only |
| Data | Postgres 17 self-hosted on the same server + Drizzle; pg-boss queue; R2 for blobs and backups | $0 extra; one stateful service |
| Code understanding | GitHub App (read-only) → tarball at a pinned SHA → tree-sitter + framework adapters | Deterministic index; repo code never executed |
| AI | Model chosen per tutorial: free pool (OpenRouter `:free`), BYOK (OpenRouter, Anthropic, OpenAI, Google) or credits; one grounding validator for every model | Platform pays \~$0 in tokens; users control quality and cost |
| Accounts | Individual developers only — no workspaces, roles or team plans | Matches the product's audience; less to build and secure |
| Hosting | One 2 vCPU / 4 GB VPS (\~€6–7/month) with Docker Compose; Cloudflare free for DNS, CDN and the static landing; R2 free tier | Lowest fixed cost; long-running workers and SSE just work |
| Money | Daily free credits → BYOK → top-ups at cost + \~15% → EthicalAds on public pages, all ad revenue to the free-tier AI pool | Revenue is not a launch goal; spend never exceeds what comes in |

**Key numbers:** fixed hosting ≈ €6–7/month plus a domain. Free-model tutorials cost $0 in tokens but OpenRouter caps free models at 1,000 requests/day per account (after a one-time $10 credit purchase), which is roughly 65–125 "lite" tutorials/day for the whole platform; heavier free users move onto their own free OpenRouter key. Frontier routing costs ≈ $2.55–5.40 per tutorial and is paid by the user's key or credits. EthicalAds pays around $2.50 per 1,000 pageviews — enough to subsidise budget-model tutorials, not a business.

**Top risks:** free-model quality and quota volatility; safekeeping users' API keys; ad revenue being small and gated by a 50k-pageviews/month minimum; incumbents adding tutorial modes. **First moves:** walking skeleton on a free model plus one BYOK path, then the eval harness run on both a free and a frontier model to measure the quality gap before any UI polish.

## 2. Product opportunity and competitive landscape

The pain is real and measured, but "AI wiki for a GitHub repo" is already free from Cognition and Google, so the product must win on **pedagogy, verifiable grounding and private/team onboarding**, not on summarisation.

### The problem, with evidence

- A field study of 78 professionals over 3,148 working hours found developers spend about 58% of their time on program comprehension, and juniors spend a larger share than seniors ([Xia et al., IEEE TSE](https://works.bepress.com/david_lo/286)). Earlier IDE-only work put it near 70% ([Siegmund et al. survey, arXiv](https://arxiv.org/pdf/2310.11301)).
- The same literature finds developers trust source code more than documentation and rarely use dedicated comprehension tools, preferring editors and compilers ([arXiv 2310.11301](https://arxiv.org/pdf/2310.11301)). Implication: every explanation must point back to the code, or it will not be trusted.
- Secondary 2026 signals (vendor blog, citing primary sources): Stack Overflow reported trust in AI tools at 29% in Feb 2026, and DX measured about 33 days to a new hire's tenth merged PR ([Unblocked, Sep 2026](https://getunblocked.com/blog/best-developer-onboarding-tools/index.md)). Treat these as directional.

### How developers learn a codebase today, and where it breaks

| Method | What works | Where it fails |
| --- | --- | --- |
| README / docs site | Fast orientation | Stale, rarely explains internals or execution flow |
| Code search and IDE navigation | Precise, trusted | No narrative; reader must build the mental model alone |
| Asking a teammate | Highest quality | Does not scale; absent for open source |
| IDE agents (Cursor, Claude Code, Copilot) | On-demand answers in context | Unstructured; answers are ephemeral, unordered, unverified, not a curriculum |
| AI repo wikis (DeepWiki, Code Wiki) | Broad reference coverage, diagrams, chat | Organised as reference, not as a learning sequence; no exercises or progress |

### Competitors

| Product | Type | What it does today | Access | Threat |
| --- | --- | --- | --- | --- |
| [DeepWiki](https://codersera.com/blog/deepwiki-complete-guide-2026/) (Cognition) | Direct (wiki) | Launched Apr 2025; 50,000+ popular repos indexed, chat, diagrams, official MCP server | Free for public repos; private via Devin | High |
| [Google Code Wiki](https://alternativeto.net/news/2025/11/google-launches-code-wiki-a-continuously-updated-and-gemini-powered-documentation-platform/) | Direct (wiki) | Public preview Nov 2025; regenerates after every change; links each section to files; Gemini chat | Free, public repos; private via a Gemini CLI extension waitlist ([DevOps.com](https://devops.com/google-code-wiki-aims-to-solve-documentations-oldest-problem/)) | High |
| [PocketFlow Tutorial-Codebase-Knowledge](https://www.sourcepulse.org/projects/2391128) | Direct (tutorial) | Open-source CLI that turns a repo into beginner chapters with diagrams; \~12k stars; HN front page Apr 2025 | Free, self-run | Medium: proves demand, no product layer |
| [deepwiki-open](https://codersera.com/blog/deepwiki-complete-developer-guide-2026/) | Direct (OSS) | Self-hosted DeepWiki clone for private repos | Free | Low–medium |
| [Swimm](https://swimm.io/?p=4726) | Indirect (enterprise) | Repositioned to legacy and mainframe "application understanding"; priced by lines of code | Sales-led | Low for this segment |
| Greptile, Unblocked, Sourcegraph | Indirect (Q&A, review, search) | Repo graph Q&A and code review; Sourcegraph stopped new Cody Free/Pro signups ([Unblocked](https://getunblocked.com/blog/best-developer-onboarding-tools/index.md)) | Paid, team | Low–medium |
| Cursor, Claude Code, Copilot | Indirect (substitute) | "Explain this repo" on demand inside the editor | Paid seats | Highest long-term |

Google's Code Wiki descends from Mutable.ai's Auto Wiki, whose team Google acqui-hired ([HackerNoon](https://sia.hackernoon.com/googles-new-tool-wants-to-end-the-most-annoying-part-of-coding)): two well-funded players already ship the reference-wiki format for free.

### Target segment

Recommendation: **individual developers only** — no team accounts, workspaces or roles.

- Developers learning an open-source codebase, to contribute or to study its patterns.
- Developers joining a new company or project who want a private walkthrough of a repo they can already access on GitHub.
- Students and self-learners studying well-known projects.
- Out of scope by design: team plans, bootcamp admin, enterprise buyers — they need admin features this product will not build.

### Differentiation that survives a free wiki

1. **A path, not a map.** Ordered chapters with stated objectives, prerequisites and "read this next" — reference wikis do not sequence learning.
2. **Verifiable grounding.** Every claim anchored to a commit-pinned file and line range, machine-checked before publish; unverified claims shown as interpretation.
3. **Task walkthroughs.** "How would I add feature X here?" traced through real files — the question new contributors actually have.
4. **Active learning.** Quizzes and exercises built from the repo's own code, with personal progress.
5. **Your model, your cost.** Pick any model — your own key, free models or small credits — with the same grounding checks applied to every model; incumbents choose the model for you.

Risk: if Code Wiki or DeepWiki add a "tutorial mode", points 1 and 4 shrink to a feature. Points 2, 3 and 5 — verified grounding, task walkthroughs and model/cost choice — plus private repos read with the developer's own GitHub permissions are the durable edge.

### Smallest experience that proves value

Paste a public TypeScript/JavaScript repo URL, and within about 10 minutes get a shareable 5–8 chapter tutorial: an architecture diagram, commit-pinned source links on every explanation, and one quiz per chapter. If learners finish chapters and say they found their way around faster, the core bet holds.

## 3. Recommended MVP and feature priorities

Release 1 is one coherent loop: **import a TypeScript/JavaScript repo → generate a grounded, chaptered tutorial → learn it with source side-by-side → check understanding with a quiz → share it**. Everything that does not strengthen that loop waits.

### Feature classification

| Feature | Tier | Value | Complexity | Platform cost | Why |
| --- | --- | --- | --- | --- | --- |
| Public repo import | Essential | High | Low | Low | Zero-friction demo and SEO surface |
| Private repo import (GitHub App, read-only, own account) | Essential | High | Medium | Low | A developer's own or employer's repos they can already read |
| Guided tutorial generation | Essential | High | High | Depends on run source | The product |
| Commit-pinned source references | Essential | High | Medium | Low | Trust; the main differentiator |
| Model selection (presets + per-role custom) | Essential | High | Medium | None | Users trade quality against cost |
| BYOK: OpenRouter key or direct Anthropic/OpenAI/Google key | Essential | High | Medium | None — the user's provider bills them | Makes heavy use free to run |
| Daily free credits on OpenRouter free models | Essential | High | Medium | $0 tokens; capped by request quota | Try it without a key or card |
| Architecture diagram (Mermaid, static) | Essential | Medium | Low | Low | One overview plus optional per-chapter flow |
| Chapter navigation + progress | Essential | High | Low | Low | Makes it a course, not a page |
| Audience level (3 presets) | Essential | Medium | Low | None | One prompt parameter |
| Per-chapter quiz (multiple choice) | Essential | Medium | Low | Low | Cheapest active-learning signal |
| Hard limits: per-user daily free cap, global pool cap, per-job budget | Essential | High | Low | None | Protects the free pool and users' own keys |
| "Repo changed since this tutorial" banner | Essential | Medium | Low | Low | Honest staleness without regeneration |
| Public tutorial pages with one EthicalAds slot | After validation | Medium | Low | Earns a little | Network accepts sites from \~50k pageviews/month |
| Prepaid credit top-ups (near cost) | After validation | Medium | Medium | Payment fees | For users who want frontier models without a key |
| Custom learning goal ("I want to add X") | After validation | High | Medium | Run source | Strongest differentiator; test early |
| Contextual AI tutor chat | After validation | Medium | Medium | Run source | Expected, but commoditised |
| Code-reading exercises | After validation | Medium | Medium | Low | Needs grading design |
| Regenerate one chapter | After validation | Medium | Medium | Run source | Needs stable chapter identity first |
| Incremental regeneration on push | After validation | Medium | High | Run source | Webhooks + diffing; banner covers v1 |
| Manual tutorial editing | Later | Medium | High | Low | Needs block editor + merge with regenerations |
| Interactive dependency graph explorer | Later | Medium | High | Low | Mermaid covers first need |
| Python / Go / Java support | Later | High | Medium per language | Low | Add by demand |
| Executing repo code in a sandbox | Only with strong evidence | Low–medium | Very high | High | Security cost far exceeds learning gain |
| Workspaces, roles, team plans, SSO | Not planned | — | — | — | Individual-developer product by design |

### Core user journey

1. Sign in with GitHub.
2. Paste a repo URL or pick from repos your GitHub App installation can read.
3. Pre-flight check (seconds, no LLM): languages, file count, size, detected framework — or a clear refusal with the reason.
4. Choose audience level and **how to run it**: free credits (small public repos), your own key, or credits; pick a model preset and see the estimated tokens and cost.
5. Watch staged progress: indexing → outline → chapters → validation.
6. Land on the outline; open chapter 1 in the learning player (lesson left, pinned source right).
7. Take the chapter quiz; progress saves; optionally publish the tutorial publicly or share a private link.

### Key user stories and acceptance criteria

| Story | Acceptance criteria |
| --- | --- |
| As a developer, I import a public repo by URL | Given a valid public URL, a job starts in under 5 s; unsupported or oversized repos are refused before any LLM call with a specific reason |
| As a developer, I connect a private repo | The GitHub App requests only read access to contents and metadata; I select individual repos; uninstalling hides my tutorials for those repos within one webhook cycle |
| As a developer, I add my own API key | The key is validated with a test call, stored encrypted, shown only as `…last4`, deletable at once, never logged, and used only for my jobs |
| As a developer, I choose how a tutorial is paid for | Before starting I see the model, estimated tokens and cost (or free-credit cost) and pick free credits, my key or credits; an invalid key or empty wallet fails before the job starts |
| As a free user, I get daily free credits | My remaining credits are visible and reset at 00:00 UTC; when the global pool is exhausted I see when it resets and a guide to use my own free OpenRouter key |
| As a learner, I see where each explanation comes from | Every code-related paragraph links to a file and line range at a fixed commit SHA; 100% of links resolve |
| As a learner, I follow a sequence | The outline orders chapters from entry point to advanced flows; each chapter lists objectives and prerequisites |
| As a learner, I check my understanding | Each chapter has 3–5 questions; every answer explanation cites a source reference |
| As a learner, I resume | Progress persists per tutorial version; returning opens the last unfinished lesson |
| As the operator, the free pool cannot be drained | Per-user daily cap and global daily cap are enforced atomically; excess requests are refused at pre-flight, never mid-job |

### Success metrics (targets to validate, not benchmarks)

- **Activation:** share of sign-ups who reach a finished tutorial.
- **Generation success rate** for repos that pass pre-flight, and p50/p95 time to ready.
- **Grounding precision:** share of source references that resolve to the cited code (target 100% via validation); share of sampled claims judged supported by the cited code.
- **Learning engagement:** chapter-1 completion, full-tutorial completion, quiz attempt rate.
- **Perceived value:** post-tutorial question "How much faster could you find your way around this repo?" plus 7-day return rate.
- **Unit cost:** median and p95 model cost per tutorial against the price per tutorial.

## 4. Technology comparison and final stack

Recommended: **pnpm 11 + Turborepo 2.x**, **Next.js 16 for both frontends with shadcn/ui (Base UI) + Tailwind v4**, and a **Fastify 5 modular monolith on Node 24 LTS, exposed through oRPC contracts, running as separate API and worker processes from one package**. HTTP framework speed is irrelevant here: LLM calls take seconds to minutes, so maturity, typing and operability decide.

### 4.1 Monorepo tooling

| Option | Setup | Caching / orchestration | Fit for 3 apps + \~6 packages | Verdict |
| --- | --- | --- | --- | --- |
| pnpm workspaces | Minimal | None (just linking) | Essential base layer | **Use** |
| + Turborepo | One `turbo.json` | Content-hash task cache, remote cache, affected-only runs, `turbo watch` | Right-sized | **Use** |
| Nx | Heavier: plugins, generators, project graph | Strong caching, module-boundary lint, generators | Built for larger orgs | Skip until many teams/packages |
| TS project references | `references` + `composite` everywhere | Incremental `tsc -b` only | Adds config churn | Only if type-check time hurts |

Facts that shape the choice:

- pnpm 11 shipped in spring 2026 with supply-chain defaults: a 1-day `minimumReleaseAge`, `strictDepBuilds` (install scripts denied unless approved) and settings read from `pnpm-workspace.yaml` ([JFrog](https://jfrog.com/help/r/artifactory-recently-published-npm-packages-may-be-blocked-for-24-hours-new-client-enforcements/artifactory-recently-published-npm-packages-may-be-blocked-for-24-hours-new-client-enforcements?contentId=cHkoIo8S6_8NEog6ipeQvw), [lilting.ch](https://lilting.ch/en/articles/pnpm-11-minimum-release-age-default-shai-hulud-defense)). Keep these on; Dependabot friction is a known side effect ([Classmethod](https://dev.classmethod.jp/en/articles/pnpm-11-minimum-release-age-dependabot-ci-failure/)).
- Turborepo 2.x is actively released (2.11.7 on 2 Oct 2026) ([releases.sh](https://releases.sh/vercel/turborepo-releases.md)); 2.3 introduced an experimental Boundaries feature ([turborepo.dev](https://turborepo.dev/blog)).
- TypeScript 6.0 (23 Mar 2026) is the last JavaScript-based compiler; the Go-native 7.0 is in preview as `@typescript/native-preview` ([Visual Studio Magazine](https://www.visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx)). Avoid 6.0-deprecated flags so 7.0 is a drop-in.

Package strategy: shared packages export TypeScript source ("just-in-time" internal packages) — Next.js transpiles them, and the API is bundled with workspace deps inlined. Type-checking runs per package as a cached `typecheck` task.

### 4.2 Frontend

| Need | Next.js 16 App Router | Vite SPA (TanStack Router) | Astro |
| --- | --- | --- | --- |
| Landing SEO, metadata, MDX docs | Strong (SSG/ISR) | Weak without prerender | Strongest for content |
| Public shareable tutorial pages (SEO, OG images) | Strong (server render) | Weak | Possible, but a third framework |
| Authenticated dashboard + learning player | Good (client components) | Simplest | Not its use case |
| One mental model across both apps | Yes | Needs a second framework for landing | Needs React islands |

**Decision: Next.js 16 for both apps.** The product app benefits from server rendering only for **public tutorial pages**, a real growth channel ("share this tutorial"). Authenticated screens are client components using TanStack Query against the API; Next.js holds **no business logic**. Next.js 16 shipped Oct 2025, 16.3 is current, and 16.2.6 patched 13 advisories in one release ([Makerkit](https://makerkit.dev/blog/md/tutorials/nextjs-16), [nextjs.org](https://nextjs.org/blog?page=1)) — pin and patch promptly.

**Design system: shadcn/ui on Base UI + Tailwind v4.** Since July 2026, Base UI is the default for new shadcn projects; Radix stays supported, and React Aria became a third base the same month ([shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default), [changelog mirror](https://forceui.public.prd.shared.perforce.com/docs/changelog)). CLI v4 added monorepo templates and presets ([Medium summary](https://medium.com/@nakranirakesh/shadcn-ui-march-2026-update-cli-v4-ai-agent-skills-and-design-system-presets-d30cf200b0e9)).

- Why shadcn over Ant Design for this product: you own the component source, so the learning player can be shaped precisely; it styles with the same Tailwind tokens across landing and product; it fits server components; data-heavy screens use TanStack Table with shadcn's Data Table pattern.
- Trade-off: you maintain copied components. Mitigate by keeping primitives in one `packages/ui` and updating through the CLI's diff.

| Concern | Choice |
| --- | --- |
| Server state | TanStack Query via oRPC's TanStack Query utilities |
| Forms | react-hook-form + Zod resolver, shadcn Field/Form |
| URL state (chapter, lesson, file, line) | `nuqs` or router search params |
| Syntax highlighting | Shiki (server-rendered, line anchors) |
| Editable snippets | CodeMirror 6, read-only by default (lighter than Monaco) |
| Diagrams | Mermaid, lazy-loaded client-side; validated server-side before publish |
| Layout | shadcn Resizable panels for lesson / code split |
| Progress | SSE stream (see section 9) |

Shared-UI rule: `packages/ui` holds primitives and tokens only. Product composites (LearningPlayer, SourcePanel, OutlineTree) live in `apps/product`, so the landing page never pulls product code.

### 4.3 Backend

| Criterion | Fastify 5 (Node) | NestJS 11 (Node) | Hono (Node/edge) | Elysia (Bun) |
| --- | --- | --- | --- | --- |
| Maturity / ecosystem | Mature plugins (rate-limit, helmet, cookie, raw body, OTel) | Richest first-party modules | Younger, growing | Youngest |
| Validation with shared Zod | Via oRPC or Zod type provider | Idiomatic path is class-validator (duplicates Zod) | Native Zod flow | TypeBox-first |
| Structure | Encapsulated plugins = modules | DI + modules, heavy | Minimal | Minimal |
| Jobs / workers | Plain Node; pg-boss or BullMQ | `@nestjs/bullmq` | Plain Node | Bun compatibility risk |
| Runtime risk for tree-sitter, git, tar | None | None | None on Node | Higher on Bun |
| Team fit (1–3 devs) | Good | Over-structured early | Good | Risky bet |

Sources: [Encore comparison](https://encore.dev/articles/nestjs-vs-fastify-vs-hono) (vendor; its req/s numbers are not a decision input), [Level Up summary](https://levelup.gitconnected.com/node-js-backend-frameworks-in-2026-the-honest-trade-offs-28112e1e5bc9).

**Decision: Fastify 5 + oRPC contract-first.** oRPC 1.0 shipped with built-in OpenAPI, contract-first workflow, typed errors and TanStack Query integration ([InfoQ](https://infoq.com/news/2025/12/orpc-v1-typesafe/)), and has a native Fastify adapter ([oRPC docs](https://orpc.unnoq.com/docs/adapters/http)); the 1.x line is current with 2.0 in beta ([newreleases](https://newreleases.io/project/github/middleapi/orpc/release/v1.10.2)). The contract lives in a shared package, so the frontend never imports backend code — unlike Hono RPC, whose client types are inferred from the server implementation.

Auth: **Better Auth** (TypeScript, self-hosted, Drizzle adapter, GitHub sign-in). Auth.js is now maintained by the Better Auth team ([authjs.dev](https://authjs.dev/getting-started/migrate-to-better-auth)), which concentrates the open-source TS auth ecosystem there. Clerk is the managed alternative if you prefer paying to operating.

### 4.4 Architecture style

| Style | Fit now | Why |
| --- | --- | --- |
| Modular monolith, single process | No | Long LLM/indexing jobs would compete with API latency and crash it together |
| **Modular monolith, separate API + worker processes** | **Yes** | One codebase and deploy unit; independent scaling and failure isolation |
| Service-oriented (indexer as its own service) | Later | When indexing needs different hardware or language |
| Microservices | No | Operational cost with no benefit at this team size |

Triggers to split further: indexing CPU or memory starves generation workers; a non-TypeScript analyzer is required (e.g. a SCIP indexer in another runtime); a module needs a separate security boundary (code execution, enterprise single-tenant); or teams step on each other's deploys.

### 4.5 Backend layout and module boundaries

```text
apps/api/src/
  main.http.ts            # Fastify + oRPC router + webhooks + SSE
  main.worker.ts          # pg-boss workers, no HTTP except /healthz
  platform/               # db, queue, storage, config, logger, crypto (key vault), errors
  modules/
    identity/             # Better Auth wiring, sessions, current user
    github/               # app installs, token minting, webhooks, access checks
    repositories/         # repos, snapshots (commit SHAs), pre-flight, cost estimate
    indexing/             # orchestrates packages/repo-analysis, stores index
    generation/           # pipeline stages, budgets, prompts via packages/ai
    models/               # BYOK keys (encrypted), model catalogue, presets, free pool
    tutorials/            # versions, content, publishing, visibility, share links
    learning/             # progress, quiz attempts
    credits/              # daily free usage, prepaid wallet ledger, ad-funded pool
  jobs/registry.ts        # job name -> handler, payload schema, retry policy
```

Each module exposes a `*.service.ts` (its public API), a `*.router.ts` (implements its slice of the contract) and private `*.repo.ts` data access. Modules call each other only through services, never another module's tables; enforce with an ESLint boundaries rule or dependency-cruiser in CI.

### 4.6 Why this stack — and why not the alternatives

The stack optimises for five things, in this order: **one language end to end** (a solo or two-person team cannot afford two toolchains), **types that are also runtime validation** (LLM output and user keys are untrusted), **no paid infrastructure until it is earned**, **no repository code ever executed**, and **mainstream tools with long support horizons**. It also keeps you on the React + TypeScript you already use daily, so new learning goes into the hard parts (indexing, grounding) rather than the framework.

| Choice | Why this | Why not the alternatives |
| --- | --- | --- |
| **TypeScript everywhere** | One language, one test runner, one lint setup; the same Zod schema validates the API, job payloads, LLM output and forms | Python backend: best ML libraries, but this product calls model APIs rather than training models, and splitting languages duplicates every contract. Go/Rust: faster, but no shared types with React and slower iteration for a small team |
| **pnpm 11** | Strict, disk-efficient workspaces, `catalog:` versions, and supply-chain defaults (release-age gate, build-script allow-list) — relevant for a product that handles private code | npm workspaces: looser isolation, no catalogs. Yarn Berry: Plug'n'Play friction with native/WASM tooling. Bun: fast, but Node-compatibility risk for pg, tar and tree-sitter tooling |
| **Turborepo** | One `turbo.json`, content-hash caching, affected-only CI | Nx: stronger generators and boundary rules, but a larger mental model than 3 apps need. No runner: CI time grows with every package |
| **Next.js 16** | Static export for the landing page (free hosting), server rendering for public tutorial pages (SEO, link previews), the React you already know | Vite SPA (React Router / TanStack Router): simpler, but no SSR for public pages. React Router 7 framework mode: viable, smaller ecosystem for static export + MDX docs. Astro: excellent landing, but a second framework. TanStack Start: promising, younger |
| **shadcn/ui on Base UI + Tailwind v4** | You own the component source, so the learning player can be shaped exactly; accessible primitives; no runtime CSS-in-JS; same tokens across landing and product | Ant Design: large runtime and an enterprise look that is hard to bend into a reading experience. MUI: heavy theming layer. Mantine/Chakra: good libraries, but you don't own the source. Radix-based shadcn: still fine; Base UI is now the default |
| **TanStack Query (via oRPC)** | Server-state caching, retries, optimistic updates, polling fallback for SSE | Redux Toolkit + RTK Query: excellent, but adds a global store this app barely needs (almost all state is server state). SWR: fewer mutation features |
| **Fastify 5** | Mature plugins (rate limit, cookies, raw body for webhook HMAC, OpenTelemetry), Node-native for tar, git and tree-sitter WASM | NestJS: decorators and DI overhead, class-validator duplicates Zod. Express: weaker typing and async handling. Hono: excellent, but its RPC types come from the server implementation. Elysia: ties you to Bun |
| **oRPC (contract-first)** | Contract package shared by both sides, typed errors, built-in OpenAPI, SSE event iterators, TanStack Query helpers | tRPC: not contract-first, OpenAPI still alpha. ts-rest: weaker TanStack integration. GraphQL: schema/codegen overhead for a single client. Hand-written REST + OpenAPI codegen: an extra build step for the same result |
| **Zod 4** | One schema → runtime validation, TS types, AI SDK structured output, form validation | Valibot: smaller bundles, smaller ecosystem. TypeBox: JSON-Schema-first, clumsier for forms |
| **PostgreSQL 17** | Relational data + JSONB documents + full-text + pgvector + the job queue in one service | MongoDB: weak relational integrity for users, repos, jobs and ledgers. SQLite: cheapest, but single-writer and awkward with separate API and worker processes. MySQL: no JSONB/pgvector parity |
| **Drizzle** | SQL-shaped queries, typed JSONB, no codegen step, small runtime | Prisma: fine, but codegen and abstractions get in the way for JSONB, `SKIP LOCKED` and pgvector. Kysely: great query builder, no schema/migration story. TypeORM: decorator-heavy, weaker types |
| **pg-boss** | Queue in the database you already run — $0, transactional enqueue | BullMQ: needs Redis (another service to pay for and back up). Trigger.dev/Inngest: managed fees and vendor dependency. Temporal: far too heavy |
| **Better Auth** | Free, self-hosted, GitHub sign-in, Drizzle adapter, sessions in your own DB | Clerk/Auth0: monthly fees and user data elsewhere. Auth.js: now maintained by the Better Auth team. Supabase Auth: ties you to Supabase. Hand-rolled auth: avoidable security risk |
| **tree-sitter (WASM)** | Fast, error-tolerant, many languages, nothing to install or execute | TypeScript compiler API: precise but heavy and TS-only. Babel/SWC: JS-only parsers without a query language. LSP/SCIP: needs project setup and installed dependencies |
| **AI SDK 6 + OpenRouter provider + direct providers** | One interface for structured output; OpenRouter gives one key for hundreds of models and the free tier; direct providers for users who bring Anthropic/OpenAI/Google keys | LangChain: heavy abstractions for a fixed pipeline. Direct SDKs only: per-vendor code and no free models. OpenRouter only: platform credits carry a 5.5% fee and an extra hop — keep direct providers for BYOK |
| **One VPS + Cloudflare free + R2** | \~€6–7/month fixed; long-running workers and SSE need no special platform | Vercel + Railway + Neon: better DX but tens of dollars a month and per-service billing. Vercel Hobby: personal, non-commercial only. Cloudflare Workers for everything: no long-running worker. Oracle Always Free: $0 but availability and reclamation risk |

## 5. Monorepo structure and shared TypeScript strategy

Keep three apps and **five** shared packages; drop `api-client` and `db` as separate packages for now. Contracts sit at the bottom of the graph, nothing imports an app, and the frontend can only see contracts and UI.

### 5.1 Package-by-package verdict

| Proposed | Verdict | Reason |
| --- | --- | --- |
| `contracts` | **Keep** | Zod schemas, oRPC contract, error codes, tutorial content schema — the only thing frontend and backend share |
| `api-client` | **Fold into the product app** | With oRPC the client is \~15 lines; promote to a package when a second consumer appears (CLI, MCP server) |
| `db` | **Fold into `apps/api`** | Only API and worker (same package) use it; keeping it inside makes an accidental frontend import impossible |
| `ai` | **Keep** | Provider abstraction, model registry, cost accounting; also used by the eval harness outside the API |
| `repository-analysis` | **Keep (renamed `repo-analysis`)** | Pure, fixture-testable library (no DB, no network); the first candidate to become a separate indexer service |
| `ui` | **Keep** | shadcn primitives + Tailwind v4 tokens shared by landing and product |
| `config` | **Keep** | tsconfig bases, lint config |
| — | **Add `tools/evals`** | Private workspace package: golden repos, grounding checks, cost tracking; runs in CI |

```text
code-tutorial-platform/
├── apps/
│   ├── product/      # Next.js 16 — app, learning player, public tutorial pages
│   ├── landing/      # Next.js 16 — marketing, pricing, docs (MDX)
│   └── api/          # Fastify + oRPC; entrypoints: main.http.ts, main.worker.ts
├── packages/
│   ├── contracts/    # zod + @orpc/contract only
│   ├── ai/           # AI SDK wrapper, model registry, budgets
│   ├── repo-analysis/# filtering, tree-sitter, symbols, import graph, chunking
│   ├── ui/           # shadcn (Base UI) primitives, tokens, globals.css
│   └── config/       # tsconfig.*.json, eslint config
├── tools/evals/      # golden repo suite + grounding/cost reports
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### 5.2 Dependency graph

```mermaid
flowchart LR
  product[apps/product] --> contracts
  product --> ui
  landing[apps/landing] --> ui
  api[apps/api] --> contracts
  api --> ai
  api --> repoa[repo-analysis]
  evals[tools/evals] --> ai
  evals --> repoa
  evals --> contracts
  contracts --> zod[(zod, @orpc/contract)]
```

Rules enforced in CI (ESLint boundaries or dependency-cruiser): no package imports an app; `contracts`, `ui`, `ai` and `repo-analysis` import no other internal package; frontend apps never import `ai`, `repo-analysis` or anything under `apps/api`.

### 5.3 Type safety without trusting compile-time types

| Boundary | Validation |
| --- | --- |
| HTTP requests | oRPC validates input against the contract before the handler runs; output is checked against the output schema |
| Job payloads | Parsed with a versioned schema at enqueue **and** at dequeue (queued jobs outlive deploys) |
| LLM output | Structured output + Zod parse; one repair attempt, then fail the stage with the validation error stored |
| GitHub webhooks | Signature verified on the raw body first, then a minimal schema parse |
| JSONB reads | Content carries `schemaVersion`; parsed and upgraded on read |
| Environment | Each process parses `process.env` with Zod at boot and exits on failure |

Database types (`InferSelectModel`) never leave a module's `*.repo.ts`; services map rows to DTOs defined in `contracts`. Job payloads carry `v: 1` in a discriminated union so a worker can process jobs enqueued by the previous release during a rolling deploy.

### 5.4 Contract → endpoint → frontend

```ts
// packages/contracts/src/repositories.ts
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const CommitSha = z.string().regex(/^[0-9a-f]{40}$/)

// How a tutorial is paid for — chosen before the job starts
export const RunWith = z.discriminatedUnion('source', [
  z.object({ source: z.literal('free') }),                    // platform pool, OpenRouter :free models
  z.object({ source: z.literal('byok'), keyId: z.uuid() }),  // the user's stored provider key
  z.object({ source: z.literal('credits') }),                 // prepaid wallet
])

export const ModelPreset = z.enum(['free', 'budget', 'balanced', 'quality', 'custom'])

export const ImportRepositoryInput = z.object({
  source: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('public_url'),
      url: z.url().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/),
      ref: z.string().max(255).optional(),
    }),
    z.object({
      kind: z.literal('installation'),
      githubRepoId: z.number().int().positive(),
      ref: z.string().max(255).optional(),
    }),
  ]),
  audience: z.enum(['newcomer', 'intermediate', 'expert']).default('intermediate'),
  runWith: RunWith,
  preset: ModelPreset.default('balanced'),
  customModels: z.object({ planner: z.string(), author: z.string(), summarizer: z.string() }).partial().optional(),
  budgetUsd: z.number().positive().max(50).optional(), // BYOK / credits ceiling for this job
})
export type ImportRepositoryInput = z.infer<typeof ImportRepositoryInput>

export const GenerationJobDto = z.object({
  jobId: z.uuid(),
  repositoryId: z.uuid(),
  commitSha: CommitSha,
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'canceled']),
  stage: z.string().nullable(),
  estimate: z.object({ requests: z.number(), costUsd: z.number() }),
})
export type GenerationJobDto = z.infer<typeof GenerationJobDto>

export const repositoriesContract = {
  import: oc
    .route({ method: 'POST', path: '/repositories/import' })
    .input(ImportRepositoryInput)
    .output(GenerationJobDto)
    .errors({
      REPO_TOO_LARGE: { data: z.object({ files: z.number(), limit: z.number() }) },
      REPO_NOT_ACCESSIBLE: {},
      FREE_REQUIRES_PUBLIC_REPO: {},
      FREE_POOL_EXHAUSTED: { data: z.object({ resetsAt: z.iso.datetime() }) },
      DAILY_FREE_LIMIT_REACHED: {},
      KEY_INVALID: {},
      INSUFFICIENT_CREDITS: { data: z.object({ neededUsd: z.number() }) },
    }),
}
```

```ts
// apps/api/src/modules/repositories/repositories.router.ts
import { implement, ORPCError } from '@orpc/server'
import { contract } from '@acme/contracts'
import type { RequestContext } from '../../platform/context'

const os = implement(contract).$context<RequestContext>()
const authed = os.use(({ context, next }) => {
  if (!context.user) throw new ORPCError('UNAUTHORIZED')
  return next({ context: { user: context.user } })
})

export const importRepository = authed.repositories.import.handler(
  async ({ input, context, errors }) => {
    const pre = await context.services.repositories.preflight(input.source, context.user)
    if (pre.kind === 'not_accessible') throw errors.REPO_NOT_ACCESSIBLE()
    if (pre.kind === 'too_large') throw errors.REPO_TOO_LARGE({ data: { files: pre.files, limit: pre.limit } })
    if (input.runWith.source === 'free' && pre.snapshot.isPrivate) throw errors.FREE_REQUIRES_PUBLIC_REPO()

    // Resolves models + who pays; reserves free requests or wallet funds atomically.
    // Throws FREE_POOL_EXHAUSTED, DAILY_FREE_LIMIT_REACHED, KEY_INVALID or INSUFFICIENT_CREDITS before any work.
    const plan = await context.services.models.resolveRun({
      userId: context.user.id, runWith: input.runWith, preset: input.preset,
      customModels: input.customModels, budgetUsd: input.budgetUsd, repoSize: pre.size,
    })
    return context.services.generation.enqueue({
      userId: context.user.id, snapshotId: pre.snapshot.id, audience: input.audience, plan,
      idempotencyKey: context.idempotencyKey,
    })
  },
)
```

```tsx
// apps/product/src/lib/orpc.ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { contract } from '@acme/contracts'

const link = new RPCLink({
  url: `${process.env.NEXT_PUBLIC_API_URL}/rpc`,
  fetch: (req, init) => fetch(req, { ...init, credentials: 'include' }),
})
export const client: ContractRouterClient<typeof contract> = createORPCClient(link)
export const orpc = createTanstackQueryUtils(client)

// apps/product/src/features/import/import-form.tsx
const importRepo = useMutation(
  orpc.repositories.import.mutationOptions({
    onSuccess: (job) => router.push(`/jobs/${job.jobId}`),
  }),
)
// typed error branch: isDefinedError(importRepo.error) && importRepo.error.code === 'REPO_TOO_LARGE'
```

The frontend imports only the contract's **type**, so no Zod schemas or server code ship to the browser unless a form reuses a schema for client-side validation — which is allowed, because the server re-validates anyway. Package names (`@acme/*`) are placeholders.

## 6. Database selection and ER model

**PostgreSQL 17 is the single system of record**, self-hosted in Docker on the same server as the API for release 1 (it costs nothing extra and the queue's polling is free there), accessed with **Drizzle ORM**. Nightly encrypted backups and large immutable artifacts (tarballs, file blobs, raw analyzer output) go to **Cloudflare R2**. No separate vector database, search engine or graph database — pgvector is installed but embeddings are deferred until evaluations show lexical + graph retrieval falls short. All private data is owned by a single user; there are no workspaces or roles.

### 6.1 Database options

| Option | Relational integrity | Generated content | Retrieval | Ops burden | Verdict |
| --- | --- | --- | --- | --- | --- |
| PostgreSQL | Strong (FKs, transactions, constraints) | JSONB for versioned documents | Full-text (`tsvector`), trigram | One system | **System of record** |
| PostgreSQL + pgvector | Same | Same | + vector KNN in the same query as filters | Same system | **Enable when needed** |
| MongoDB | Weak cross-document transactions for this shape | Natural documents | Atlas Vector Search | Second system or all-in | Reject: the domain is relational (tenants, access, jobs, billing) |
| Dedicated vector DB (Qdrant, Pinecone, Turbopuffer) | None | No | Strong ANN at scale | Extra sync path | Only at very large corpus or latency targets |
| Search engine (Meilisearch, Typesense, OpenSearch) | None | No | Strong lexical | Extra service | Only if cross-repo search becomes a product feature |
| Graph DB (Neo4j) | None | No | Multi-hop traversal | Extra service | Reject: per-snapshot graphs fit in worker memory |

Why the graph DB is unnecessary: one repository snapshot's import graph (thousands of nodes, tens of thousands of edges) fits in memory, so traversal happens inside the worker; Postgres stores edges for UI and drift queries.

Why no vector index yet: pgvector applies filters **after** an approximate (HNSW) scan, so a selective `WHERE snapshot_id = …` can return too few rows unless iterative scans are tuned ([pgvector docs mirror](https://docs.tantorlabs.ru/tdb/en/17_10/se/vector.html)); the 0.8.x line added iterative scans and HNSW fixes ([Pigsty](https://pigsty.io/ext/e/vector/)). Retrieval here is always scoped to one snapshot of a few thousand chunks, so **exact search over a B-tree-filtered snapshot** is simpler and has perfect recall. Add HNSW only for cross-repo search.

### 6.2 Answers to the core data questions

1. **System of record:** PostgreSQL.
2. **Separate vector DB:** No. pgvector `halfvec` columns on a `chunks` table when semantic retrieval is justified.
3. **Tutorial content:** Hybrid. The full tutorial for one version is an immutable, schema-versioned **JSONB document**; everything queried across documents is normalised: versions, source references (for drift detection), progress, quiz attempts.
4. **Object storage:** downloaded tarballs (TTL), file contents addressed by git blob SHA (deduplicated across commits), raw analyzer output, nightly database backups.
5. **Versions:** `repository → snapshot (commit SHA + analyzer version) → tutorial_version`. A tutorial version is pinned to exactly one snapshot and records the models that wrote it.
6. **Jobs:** a `generation_jobs` row is the durable truth (status, stage, run source, models, budget, spend, error); `job_events` is an append-only log that also feeds SSE replay. The queue (pg-boss tables in the same database) only delivers work.
7. **Access control:** every private row belongs to one user. Private repository content is readable only by the user whose GitHub installation grants access; public tutorials are readable by anyone. There are no roles.
8. **Search / graph / indexing system:** not in release 1.
9. **Evolution:** move Postgres to a managed service (Neon) when uptime or data size outgrow one server; partition `job_events` and `chunks`; HNSW or a vector store only for cross-repo semantic search.

### 6.3 Where Postgres runs

| Option | Cost (checked Oct 2026) | Fit now |
| --- | --- | --- |
| **Postgres 17 in Docker on the app server** | $0 extra (shares the \~€6–7/month VPS) | **Recommended for release 1**; you own backups and upgrades |
| [Neon](https://neon.com/pricing) Free | $0: 100 CU-hours/project/month, 0.5 GB | Too small here: pg-boss polling keeps compute awake (0.25 CU × \~730 h ≈ 180 CU-hours/month) |
| Neon Launch | $0.106/CU-hour + $0.35/GB-month — about $19/month for 0.25 CU always on | **First managed step** when you want point-in-time restore and branching |
| [Supabase](https://www.activepieces.com/blog/supabase-pricing-free-tier-limits-pro-costs-egress.md) Pro | $25/month incl. $10 compute credit | Only worth it if you also adopt its auth and storage |

Self-hosting means you are the DBA. Keep it boring: a pinned `postgres:17` image on a named volume; nightly compressed and encrypted `pg_dump` to R2 with 14-day retention; a monthly restore drill into a scratch container; alerts on disk usage and failed backups; `shared_buffers` around 512 MB on a 4 GB box. Move to Neon Launch when a few hours of downtime become unacceptable or the data outgrows the server's disk.

### 6.4 ORM: Drizzle vs Prisma

| Criterion | Drizzle | Prisma |
| --- | --- | --- |
| Schema | TypeScript, no generate step | PSL + `prisma generate` |
| SQL control (JSONB, CTEs, pgvector, `FOR UPDATE SKIP LOCKED`) | Transparent, close to SQL | Abstracted; raw SQL for edge cases |
| Migrations | SQL files from `drizzle-kit generate`, reviewable | Prisma Migrate, more automatic |
| Stability (Sep 2026) | 0.45.2 stable, 1.0 in beta; core team hired by PlanetScale in Mar 2026 | 7.10 stable; 8.0 RC, and `latest` resolved to the RC |

Sources: [Makerkit](https://makerkit.dev/blog/md/tutorials/drizzle-vs-prisma), [Kustiq](https://kustiq.com/company/drizzle.team). **Decision: Drizzle 0.45.x pinned**, upgrade to 1.0 once stable. Prisma 7 removed most of the old performance gap ([techsy](https://techsy.io/blog/prisma-vs-drizzle-orm)), so this is a fit decision (SQL transparency, typed JSONB, no codegen), not a speed one.

Migration strategy: `drizzle-kit generate` → SQL committed and reviewed → applied by a one-off `migrate` step in CD **before** new app code rolls out; breaking changes use expand → backfill → contract across two deploys; `drizzle-kit push` only against local and preview branches.

### 6.5 ER diagram

```mermaid
erDiagram
  users ||--o{ github_installations : installs
  users ||--o{ user_repositories : links
  repositories ||--o{ user_repositories : linked_by
  github_installations ||--o{ user_repositories : grants
  users ||--o{ provider_keys : stores
  users ||--o| model_preferences : sets
  repositories ||--o{ repo_snapshots : has
  repo_snapshots ||--o{ snapshot_files : contains
  repo_snapshots ||--o{ symbols : defines
  repo_snapshots ||--o{ file_edges : links
  repo_snapshots ||--o{ chunks : "chunked (phase 2)"
  users ||--o{ generation_jobs : runs
  provider_keys ||--o{ generation_jobs : pays_for
  repo_snapshots ||--o{ generation_jobs : input
  generation_jobs ||--o{ job_stages : checkpoints
  generation_jobs ||--o{ job_events : logs
  generation_jobs ||--o{ llm_calls : spends
  users ||--o{ tutorials : owns
  repositories ||--o{ tutorials : about
  tutorials ||--o{ tutorial_versions : has
  repo_snapshots ||--o{ tutorial_versions : pins
  tutorial_versions ||--o{ tutorial_source_refs : cites
  tutorial_versions ||--o{ learning_progress : tracks
  users ||--o{ learning_progress : makes
  tutorial_versions ||--o{ quiz_attempts : records
  users ||--o{ daily_free_usage : uses
  users ||--o{ credit_ledger : funds
```

### 6.6 Tables

| Table | Key fields | Keys and constraints | Indexes |
| --- | --- | --- | --- |
| `users`, `sessions`, `accounts`, `verifications` | Better Auth core schema | Generated by Better Auth | Generated |
| `github_installations` | `github_installation_id`, `user_id` (installer), `account_login`, `suspended_at`, `deleted_at` | Unique `github_installation_id` | (`user_id`) |
| `repositories` | `github_repo_id`, `owner`, `name`, `is_private`, `default_branch` | Unique `github_repo_id` (global, enables reuse of public snapshots) | (`owner`, `name`) |
| `user_repositories` | `user_id`, `repository_id`, `installation_id` (null for public), `revoked_at` | PK (`user_id`, `repository_id`) | (`installation_id`) |
| `provider_keys` | `user_id`, `provider` (openrouter, anthropic, openai, google), `label`, `ciphertext`, `iv`, `key_version`, `last4`, `last_validated_at` | Unique (`user_id`, `provider`, `label`) | (`user_id`) |
| `model_preferences` | `user_id`, `preset`, `custom_models` JSONB, `default_budget_usd` | PK `user_id` | — |
| `repo_snapshots` | `repository_id`, `commit_sha`, `analyzer_version`, `status`, `stats` JSONB, `artifact_key` | Unique (`repository_id`, `commit_sha`, `analyzer_version`) | (`repository_id`, `created_at` desc) |
| `snapshot_files` | `snapshot_id`, `path`, `blob_sha`, `language`, `size_bytes`, `role` | PK (`snapshot_id`, `path`) | (`snapshot_id`, `language`); (`blob_sha`) |
| `symbols` | `snapshot_id`, `symbol_key`, `kind`, `path`, `start_line`, `end_line`, `exported`, `signature` | Unique (`snapshot_id`, `symbol_key`) | (`snapshot_id`, `path`); trigram on `name` |
| `file_edges` | `snapshot_id`, `from_path`, `to_path`, `kind` | PK (`snapshot_id`, `from_path`, `to_path`, `kind`) | (`snapshot_id`, `to_path`) |
| `chunks` (phase 2) | `snapshot_id`, `path`, line range, `symbol_key`, `tsv`, `embedding halfvec(1024)` null | PK `id` | (`snapshot_id`); GIN on `tsv` |
| `generation_jobs` | `user_id`, `snapshot_id`, `tutorial_id`, `kind`, `status`, `stage`, `progress`, `idempotency_key`, `run_source` (free, byok, credits), `key_id`, `models` JSONB, `budget_micros`, `spent_micros`, `free_requests_reserved`, `attempts`, `heartbeat_at`, `error_code`, `error_detail` | Unique (`user_id`, `idempotency_key`) | (`status`, `heartbeat_at`); (`user_id`, `created_at` desc) |
| `job_stages` | `job_id`, `stage`, `status`, `attempt`, `output_key`, `output_hash` | PK (`job_id`, `stage`) | — |
| `job_events` | `id` bigserial, `job_id`, `type`, `stage`, `data` JSONB, `at` | PK `id` | (`job_id`, `id`) |
| `llm_calls` | `job_id`, `stage`, `provider`, `model`, `run_source`, token counts, `cost_micros`, `latency_ms`, `status` | PK `id` | (`job_id`); (`created_at`) |
| `tutorials` | `user_id`, `repository_id`, `slug`, `title`, `visibility` (private, link, public), `share_token`, `current_version_id` | Unique (`user_id`, `slug`); unique `share_token` | (`repository_id`); (`visibility`) |
| `tutorial_versions` | `tutorial_id`, `version_no`, `snapshot_id`, `schema_version`, `status`, `audience`, `content` JSONB, `validation_report` JSONB, `generator` JSONB (pipeline version, models, prompt hashes) | Unique (`tutorial_id`, `version_no`) | (`snapshot_id`) |
| `tutorial_source_refs` | `version_id`, `lesson_key`, `ref_id`, `path`, line range, `blob_sha`, `symbol_key` | PK (`version_id`, `ref_id`) | (`path`) |
| `learning_progress` | `user_id`, `tutorial_id`, `version_id`, `lesson_key`, `status`, `completed_at` | PK (`user_id`, `version_id`, `lesson_key`) | (`user_id`, `tutorial_id`) |
| `quiz_attempts` | `user_id`, `version_id`, `question_key`, `choice_key`, `correct`, `at` | PK `id` | (`user_id`, `version_id`) |
| `daily_free_usage` | `user_id`, `day`, `requests_used`, `tutorials_used` | PK (`user_id`, `day`) | — |
| `free_pool_daily` | `day`, `requests_used`, `requests_limit`, `paid_budget_micros` (ad-funded) | PK `day` | — |
| `credit_ledger` | `user_id`, `delta_micros`, `reason` (topup, reserve, settle, refund), `ref_id` | PK `id` | (`user_id`, `created_at`) |
| `ad_revenue_monthly` | `month`, `network`, `revenue_micros`, `allocated_micros` | PK (`month`, `network`) | — |
| `webhook_deliveries` | `source`, `delivery_id`, `event`, `received_at`, `processed_at` | Unique (`source`, `delivery_id`) | — |

Free-credit enforcement is two atomic statements in one transaction: `UPDATE free_pool_daily SET requests_used = requests_used + $n WHERE day = $d AND requests_used + $n <= requests_limit`, and the same pattern on `daily_free_usage` for the user — no row back means `FREE_POOL_EXHAUSTED` or `DAILY_FREE_LIMIT_REACHED`. Unused requests are returned when the job ends. Paid credits are a ledger: the job inserts a negative reservation inside the same transaction that checks the balance, then settles to actual cost or refunds.

### 6.7 Tenancy, retention and deletion

- **Isolation:** every private row carries `user_id`; services take the session's user ID, and a `scoped(userId)` repository helper makes the filter impossible to forget; CI includes cross-user tests (user A requests B's IDs → 404).
- **Shared public data:** public repos' snapshots and public tutorials are global, so a second import of the same commit reuses the index. Private snapshots are readable only through a non-revoked `user_repositories` link.
- **Keys:** provider keys are envelope-encrypted (section 11.4) and decrypted only inside the worker, in memory, for that user's job; deleting a key is immediate.
- **Retention:** tarballs deleted after indexing (≤ 24 h); private blobs kept only while a tutorial version or active link references them; `job_events` and `llm_calls` 90 days; prompts and completions for private repos are not stored (hashes and token counts only).
- **Revocation and deletion:** an uninstall or repo-removal webhook sets `revoked_at`, hides the user's tutorials for that repo and schedules blob deletion. Account deletion removes keys, progress, private tutorials and blobs; the user chooses whether their public tutorials are deleted or kept anonymised.

Migration order: auth → GitHub installations, repositories, user links → provider keys and model preferences → snapshots/files/symbols/edges → jobs/stages/events/LLM calls → tutorials/versions/source refs → progress/quiz → free usage, pool and credit ledger → ad accounting → chunks + pgvector.

### 6.8 Foundational Drizzle schema (excerpt)

```ts
// apps/api/src/platform/db/schema.ts
import { bigint, bigserial, boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey,
  text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
import { user } from './auth-schema' // generated by Better Auth
import type { TutorialContent, SnapshotStats, JobEventData, ModelPlan } from '@acme/contracts'

const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
const ts = (name: string) => timestamp(name, { withTimezone: true })
const ownerId = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })

export const provider = pgEnum('provider', ['openrouter', 'anthropic', 'openai', 'google'])
export const runSource = pgEnum('run_source', ['free', 'byok', 'credits'])
export const jobStatus = pgEnum('job_status',
  ['queued', 'running', 'waiting_retry', 'stalled', 'canceling', 'succeeded', 'failed', 'canceled'])

export const providerKeys = pgTable('provider_keys', {
  id: id(), userId: ownerId(), provider: provider('provider').notNull(),
  label: text('label').notNull().default('default'),
  ciphertext: text('ciphertext').notNull(), // AES-256-GCM; the data key is wrapped by KEY_ENCRYPTION_KEY
  iv: text('iv').notNull(), keyVersion: integer('key_version').notNull(),
  last4: text('last4').notNull(), lastValidatedAt: ts('last_validated_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex().on(t.userId, t.provider, t.label)])

export const repositories = pgTable('repositories', {
  id: id(),
  githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull().unique(),
  owner: text('owner').notNull(), name: text('name').notNull(),
  isPrivate: boolean('is_private').notNull(), defaultBranch: text('default_branch').notNull(),
})

export const userRepositories = pgTable('user_repositories', {
  userId: ownerId(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id),
  installationId: bigint('installation_id', { mode: 'number' }),
  revokedAt: ts('revoked_at'),
}, (t) => [primaryKey({ columns: [t.userId, t.repositoryId] })])

export const repoSnapshots = pgTable('repo_snapshots', {
  id: id(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id),
  commitSha: text('commit_sha').notNull(), analyzerVersion: integer('analyzer_version').notNull(),
  status: text('status').notNull().default('pending'),
  stats: jsonb('stats').$type<SnapshotStats>(), artifactKey: text('artifact_key'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [uniqueIndex().on(t.repositoryId, t.commitSha, t.analyzerVersion)])

export const generationJobs = pgTable('generation_jobs', {
  id: id(), userId: ownerId(),
  snapshotId: uuid('snapshot_id').notNull().references(() => repoSnapshots.id),
  tutorialId: uuid('tutorial_id'), kind: text('kind').notNull(),
  status: jobStatus('status').notNull().default('queued'),
  stage: text('stage'), progress: integer('progress').notNull().default(0),
  idempotencyKey: text('idempotency_key').notNull(),
  runSource: runSource('run_source').notNull(),
  keyId: uuid('key_id').references(() => providerKeys.id, { onDelete: 'set null' }),
  models: jsonb('models').$type<ModelPlan>().notNull(),
  budgetMicros: bigint('budget_micros', { mode: 'number' }).notNull(),
  spentMicros: bigint('spent_micros', { mode: 'number' }).notNull().default(0),
  freeRequestsReserved: integer('free_requests_reserved').notNull().default(0),
  attempts: integer('attempts').notNull().default(0), heartbeatAt: ts('heartbeat_at'),
  errorCode: text('error_code'), errorDetail: jsonb('error_detail'),
  createdAt: ts('created_at').notNull().defaultNow(), finishedAt: ts('finished_at'),
}, (t) => [uniqueIndex().on(t.userId, t.idempotencyKey), index().on(t.status, t.heartbeatAt)])

export const jobEvents = pgTable('job_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  jobId: uuid('job_id').notNull().references(() => generationJobs.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), stage: text('stage'),
  data: jsonb('data').$type<JobEventData>(), at: ts('at').notNull().defaultNow(),
}, (t) => [index().on(t.jobId, t.id)])

export const tutorialVersions = pgTable('tutorial_versions', {
  id: id(), tutorialId: uuid('tutorial_id').notNull(), versionNo: integer('version_no').notNull(),
  snapshotId: uuid('snapshot_id').notNull().references(() => repoSnapshots.id),
  schemaVersion: integer('schema_version').notNull(), status: text('status').notNull().default('draft'),
  content: jsonb('content').$type<TutorialContent>(), validationReport: jsonb('validation_report'),
  generator: jsonb('generator').notNull(), publishedAt: ts('published_at'),
}, (t) => [uniqueIndex().on(t.tutorialId, t.versionNo), index().on(t.snapshotId)])

export const dailyFreeUsage = pgTable('daily_free_usage', {
  userId: ownerId(), day: date('day').notNull(),
  requestsUsed: integer('requests_used').notNull().default(0),
  tutorialsUsed: integer('tutorials_used').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })])

export const creditLedger = pgTable('credit_ledger', {
  id: bigserial('id', { mode: 'number' }).primaryKey(), userId: ownerId(),
  deltaMicros: bigint('delta_micros', { mode: 'number' }).notNull(),
  reason: text('reason').notNull(), // topup | reserve | settle | refund
  refId: text('ref_id'), createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index().on(t.userId, t.createdAt)])
```

(`is_private` is a `boolean` column. Postgres 18 also offers a native `uuidv7()` default if your provider runs 18.)

Reproducibility: every source reference stores `path`, line range and **blob SHA** at a pinned commit, and every version stores the pipeline version, model IDs and prompt hashes — so a published lesson always links to exact, permanent code (`github.com/<owner>/<repo>/blob/<sha>/<path>#L10-L24`) and can be regenerated under known conditions.

## 7. Repository ingestion and code understanding

Use a **GitHub App with read-only Contents and Metadata**, pre-flight with the Git Trees API, download **one tarball per pinned commit SHA**, extract it safely into an ephemeral worker directory, and build a **deterministic static index (tree-sitter + TS-aware module resolution + framework adapters)**. Retrieval is graph expansion + lexical search + model-guided file selection; embeddings are an optional later layer. Release 1 supports **TypeScript/JavaScript only**.

### 7.1 GitHub App, not OAuth App

| Concern | GitHub App | OAuth App |
| --- | --- | --- |
| Scope of access | Fine-grained permissions; the owner selects individual repos | Classic `repo` scope = read **and write** to every private repo the user can reach |
| Token | Installation token valid 1 hour, minted from the app's private key | User token tied to a person |
| Survives the user leaving | Yes (installation belongs to the org) | No |
| Rate limit (REST) | 5,000/h per installation, scaling with repos and users up to 12,500/h; 15,000/h on Enterprise Cloud | 5,000/h per user |
| Webhooks | One central endpoint for all installations | Configured per repo/org |

Sources: [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [Unified.to comparison](https://docs.unified.to/skills/github-oauth-app/SKILL.md). The same comparison notes GitHub began rolling out a **stateless installation-token format from 27 Apr 2026** — treat tokens as opaque strings, never parse them.

Permissions to request: repository **Contents: read**, **Metadata: read**; webhooks `installation`, `installation_repositories`, `repository` (rename/delete/visibility) and later `push`. Users sign in through the same app's OAuth credentials with no extra scopes. **Public repos** are fetched with the signed-in user's token so rate limits are attributed per user; anonymous calls are capped at 60/h per IP ([agent wiki citing GitHub docs](https://moltchat-agent-commons.onrender.com/wiki/GitHub_REST_API_rate_limits_unauthenticated_vs_token)).

### 7.2 Ingestion method

| Method | Requests | Pros | Cons | Use |
| --- | --- | --- | --- | --- |
| Git Trees API (`recursive=1`) | 1 | Paths, sizes, blob SHAs without downloading content | Truncated on very large trees | **Pre-flight** (seconds, no LLM) |
| Tarball API at a commit SHA | 1 | No `git` binary, no history, simple streaming | Downloads everything in the commit | **Default download** |
| Shallow partial clone (`--depth 1 --filter=blob:limit=…` + sparse checkout) | Git protocol | Fetches only chosen paths of huge monorepos | Needs `git`, token handling in URLs | Later: "tutorial for `packages/x` only" |
| Contents API per file | 1 per file | Precise | Burns rate limit | Only for on-demand single files |

Rules: resolve any branch or tag to a **commit SHA** first and pin everything to it; skip submodules (shown as external links); skip Git LFS pointer files; parse lockfiles for exact versions but **never install dependencies or run scripts**.

### 7.3 Filtering, limits and safe extraction

| Rule | Initial value (assumption to tune with data) |
| --- | --- |
| Excluded directories | `node_modules`, `vendor`, `dist`, `build`, `out`, `.next`, `coverage`, `.git`, plus paths marked `linguist-generated` / `linguist-vendored` in `.gitattributes` |
| Binary detection | Extension list + NUL-byte sniff; binaries recorded as metadata only |
| Per-file cap | Index up to 1 MB; larger files listed but not parsed |
| Repo cap (free tier) | \~5,000 included source files and \~50 MB uncompressed included content |
| Download guard | Abort the stream past a byte ceiling; cap entry count and compression ratio |
| Path safety | Reject absolute paths, `..` segments, symlinks, hardlinks and device entries; normalise Unicode |
| Runtime | Extract to a per-job temp dir on a `noexec` volume; delete after indexing |

The refusal message is product UX: tell users which limit was hit and suggest scoping to a sub-directory (a later feature).

### 7.4 Webhooks and change detection

Verify `X-Hub-Signature-256` (HMAC-SHA256 of the **raw** body, constant-time compare) before parsing; dedupe on `X-GitHub-Delivery` in `webhook_deliveries`; acknowledge fast and enqueue the work. A `push` to the default branch records the new head SHA and marks tutorial versions stale by intersecting changed paths with `tutorial_source_refs` — that powers the release-1 "repo changed" banner and, later, chapter-level regeneration.

### 7.5 The code-understanding engine

| Layer | Technique | Deterministic? | Output |
| --- | --- | --- | --- |
| 1. Inventory | Walk tree; classify role (source, test, config, doc, generated); language by extension | Yes | `snapshot_files` |
| 2. Manifests | `package.json` (scripts, bin, main/exports, workspaces, deps), `tsconfig` paths, lockfile versions, framework configs | Yes | Stack profile: framework, router, state, data layer |
| 3. Parsing | tree-sitter via WASM (`web-tree-sitter`, TS/TSX/JS grammars): declarations, exports, imports, JSX usage, call sites, hooks (`use*`) | Yes | `symbols` |
| 4. Module resolution | Relative paths, extensions, `index` files, tsconfig `paths`/`baseUrl`, workspace package names | Yes | `file_edges` (import graph) |
| 5. Framework adapters | Next.js app/pages routes, React Router configs, Express/Fastify/Hono route registration, Redux/Zustand stores, `fetch`/axios/RPC client calls, env-var reads | Yes (rule-based) | Routes, API call sites, stores |
| 6. Entry points | `scripts.dev`/`start`, `bin`, `main`, framework conventions (`app/layout.tsx`, `src/main.tsx`), `listen()` calls | Yes | Ranked entry points |
| 7. Tests | Naming conventions + imports from tests to subjects | Yes | `test_of` edges |
| 8. Docs | README, `docs/`, ADRs, TSDoc comments | Yes | Doc snippets linked to paths |
| 9. Graph analytics | Fan-in/out, PageRank on the import graph, community detection | Yes | Core modules; candidate subsystems → chapter candidates |
| 10. Summaries | Per-file summary (small model), per-subsystem summary (mid model), cached by **blob SHA** | No (LLM) | Reusable across commits |

Why tree-sitter first: it is fast, error-tolerant and multi-language — GitHub uses it for search-based code navigation ([GitHub changelog](https://github.blog/changelog/label/code-navigation)). Its limit is that references are syntactic, so call edges are "likely", not proven. **Precise** cross-file references come from a type-checker-based indexer such as `scip-typescript` ([Sourcegraph](https://sourcegraph.com/blog/announcing-scip)); it needs a working `tsconfig` and, for full types, installed dependencies — which means running package installs. Phase 2 option: run the TypeScript language service (or `scip-typescript`) **without** installing dependencies, inside the isolated indexer, accepting `any` for external types; in-repo references still resolve.

### 7.6 Retrieval: what answers which question

| Question | Primary technique | Supporting | LLM role |
| --- | --- | --- | --- |
| What starts the application? | Manifests + entry-point rules | Framework adapter | Narrate the boot sequence |
| Which components depend on service X? | Reverse import graph | Identifier lexical search | Filter false positives |
| How does a user action propagate? | Route/handler adapters + call-site graph + client-call ↔ server-route path matching | Lexical search on handler names | Narrate; each hop must exist in the index |
| Where is data structure D created, transformed, consumed? | Symbol lookup + lexical references | Import graph; TS language service later | Classify each site |
| Which files matter for implementing feature F? | Lexical (BM25 over identifiers, paths, doc text) | Graph expansion 1–2 hops from top hits; embeddings optional | Re-rank and justify |
| Which tests verify behaviour B? | `test_of` edges | Lexical match on `describe`/`it` strings | Pick and explain |

| Approach | Strength | Weakness | Role here |
| --- | --- | --- | --- |
| AST-aware (tree-sitter) | Exact structure, symbol boundaries, cheap | No semantics across files | Foundation; chunk boundaries |
| Graph expansion | Follows real dependencies | Depends on resolution quality | Primary context builder |
| Lexical (BM25 / trigram) | Precise on identifiers and paths | Misses paraphrased concepts | Primary search |
| Semantic (embeddings) | Concept-level recall ("where do we handle auth") | Indexing cost, stale copies, fuzzy on identifiers | Optional, gated by evals |
| Agentic (model calls search tools iteratively) | Adapts, self-corrects | More calls and latency | Used inside generation stages |

Evidence on embeddings: Claude Code's developers reported that an early RAG + local vector DB design was dropped because agentic search "generally works better" ([SmartScope summary](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/), [AI Engineer talk](https://www.ai.engineer/talks/UM6sFg_jdlE-rag-is-dead-right-kuba-rogut)); Cursor, by contrast, maintains a semantic index ([same talk](https://www.ai.engineer/talks/UM6sFg_jdlE-rag-is-dead-right-kuba-rogut)). The disagreement is real, and depends on task: precise navigation favours lexical/agentic; vague conceptual questions in chat favour semantic. Decide with your own eval set (section 8.5).

### 7.7 Language strategy and index hygiene

- **Release 1:** TypeScript and JavaScript (React, Next.js, Node backends). One ecosystem done well beats five done shallowly, and it matches the likely early users.
- **Next:** Python, then Go — each needs grammars, module resolution and framework adapters (FastAPI/Django; net/http/Gin).
- **Symbol identity:** `symbol_key = path#qualified.name` plus kind; the same key across commits lets progress, quizzes and source references survive regeneration when code moves little.
- **Versioning:** every index row hangs off a snapshot `(repository, commit SHA, analyzer_version)`; bumping the analyzer version re-indexes lazily; blob-SHA caching makes re-indexing a new commit cost roughly the changed files only.

## 8. AI tutorial-generation architecture

Use a **deterministic, staged pipeline with typed contracts between stages**, where LLMs do only what code cannot (architecture narrative, curriculum design, explanation) and **every claim must carry evidence the system verifies**. Bounded agentic loops (read-only index tools, capped steps) live inside lesson writing only. On the default frontier routing, model cost is roughly **$2.50–$5.50 per tutorial** for small to large repos under the assumptions in 8.7.

### 8.1 Architecture options

| Approach | Quality | Cost / latency | Debuggability | Reproducibility | Verdict |
| --- | --- | --- | --- | --- | --- |
| Single pass (whole repo in a 1M context) | Shallow, unordered on large repos | High per run, no reuse | Poor | Poor | Prototype only |
| Multi-stage, fixed | Good | Medium; cacheable stages | Good | Good | **Backbone** |
| Planner + generator | Good structure | Medium | Good | Good | **Used** (outline → lessons) |
| Fully agentic (open-ended exploration) | Can be excellent | Unbounded, variable | Hard | Poor | Only inside bounded steps |
| RAG over chunks | Depends on retrieval | Low | Medium | Medium | A tool, not the architecture |
| AST/graph-assisted | Strong grounding | Low | Good | Good | **Context builder** |
| Deterministic pipeline + selective AI | Strong | Lowest | Best | Best | **Overall pattern** |

### 8.2 Pipeline

Changes to the proposed sequence: the **learner profile is an input**, not a mid-pipeline stage; **validation runs after every LLM stage**, not only at the end; quizzes are written **with** each lesson (same context, cheaper); structural diagrams are **generated from the graph**, not by the model.

| # | Stage | Kind | Model tier | Parallel | Depends on | Output contract |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Pre-flight | Deterministic | — | — | Request | Accept / refuse + estimate |
| 1 | Ingest | Deterministic | — | — | 0 | Files on disk, `snapshot_files` |
| 2 | Static index | Deterministic | — | Per file | 1 | Symbols, edges, routes, stack profile |
| 3 | File summaries (central files only) | LLM | Small | Yes, many | 2 | `FileSummary[]`, cached by blob SHA |
| 4 | Architecture model | LLM + checks | Strong | No | 2, 3 | `ArchitectureModel` (subsystems, flows, decisions, each with evidence) |
| 5 | Outline (curriculum) | LLM + checks | Strong | No | 4 + learner profile | `Outline` (chapters, objectives, prerequisites, key symbols) |
| 6 | Context packing per chapter | Deterministic | — | Per chapter | 2, 5 | Token-budgeted excerpts |
| 7 | Lessons + quiz per chapter | LLM, bounded tools | Mid | **Per chapter** | 5, 6 | `Chapter` blocks with claim→evidence links |
| 8 | Diagrams | Deterministic (structure) + LLM (flows) | Mid | Per chapter | 2, 7 | Mermaid source + node→symbol map |
| 9 | Validation and repair | Deterministic + LLM judge sample | Small/mid | Per chapter | 7, 8 | Validation report; ≤1 repair per lesson |
| 10 | Publish | Deterministic, one transaction | — | — | 9 | `tutorial_versions`, `tutorial_source_refs` |
| 11 | Change detection | Deterministic (webhook) | — | — | Push event | Stale lessons list |
| 12 | Incremental regeneration (later) | Stages 6–10 for stale chapters | Mid | Per chapter | 11 | New version reusing unchanged chapters |

Strict ordering: 2 → 4 → 5 is the critical path (each consumes the previous output). Parallelism lives in stages 3 and 7–9, bounded by a per-job concurrency limit so one large repo cannot monopolise provider rate limits.

### 8.3 Grounding: how claims become trustworthy

Principle: **the model points, the system quotes.** The model never writes repository code into a lesson; it references a symbol key or a short anchor quote, and the system inserts the exact excerpt and computes line numbers from the index. Models are unreliable with line numbers and invent code; this design removes both failure modes.

| Check | Method | On failure |
| --- | --- | --- |
| File path exists | Lookup in `snapshot_files` | Drop reference; flag claim |
| Symbol exists | Lookup by `symbol_key` | Try fuzzy match by name in same file; else flag |
| Anchor quote matches | Normalised substring search within the file; line range recomputed | Flag; one repair attempt |
| Fabricated identifiers | Extract backticked identifiers from prose; check against symbols, file names, `package.json` deps | Flag unknowns; repair or rewrite as interpretation |
| Execution-flow claims | Each hop "A calls/imports/renders B" must exist as an edge or call site | Downgrade to "interpretation" or remove |
| Stack contradictions | Compare lesson assertions against the stack profile (e.g. "uses Redux" vs detected Zustand) | Fail the lesson |
| Cross-lesson contradictions | LLM judge over the architecture facts table (sampled) | Flag for repair |
| Missing context | Model may emit `openQuestions[]` instead of guessing | Shown to learners as open questions |
| Diagrams | Parse with Mermaid's parser in the worker; node labels must map to known symbols/files; node cap | Regenerate once; else omit diagram |
| Unsafe Markdown | Allowlist renderer; no raw HTML; links only to repo permalinks or allowlisted domains | Strip |

Every claim block carries `kind: 'observed' | 'interpretation'`. Observed claims require at least one verified reference; interpretations ("likely chosen to…") are rendered with a distinct style. Lesson confidence = verified-claim ratio × judge score, stored in the validation report and surfaced quietly.

Hard repositories: oversized → scope to a sub-directory or the top subsystems; incomplete (imports to missing files) → note it in the overview; poorly documented → rely on code and say so; unsupported language → refuse at pre-flight. Low confidence → publish as "Draft" with a visible banner rather than failing silently.

### 8.4 Evaluation framework

Build `tools/evals` before tuning prompts. A **golden set of \~20–30 repositories** spanning sizes and shapes, each with a human-written truth sheet: real entry points, 3–5 key flows, core modules, 10 verifiable facts.

| Metric | How measured | Target (initial, to validate) |
| --- | --- | --- |
| Reference validity (post-validation) | Deterministic resolver | 100% |
| Reference validity (pre-repair) | Same, before repair | Tracked as a model-quality signal |
| Fabricated identifiers per 1,000 words | Identifier checker | Trending to 0 |
| Claim support | LLM judge, calibrated monthly against human labels on a sample | ≥ 95% of observed claims |
| Coverage | Truth-sheet entry points, flows and modules correctly covered | ≥ 80% |
| Sequencing | Prerequisites appear before use | 100% |
| Quiz quality | Answerable from cited code; exactly one correct option (judge + spot checks) | ≥ 90% |
| Learner outcome | Timed orientation tasks with vs without the tutorial (small user study) | Measurable reduction |
| Cost and latency | `llm_calls` + job timings by repo size | Within budget per tier |

| Representative case | What it stresses |
| --- | --- |
| Small Express/Fastify REST API | Route discovery, request lifecycle narrative |
| Next.js App Router SaaS | File-system routes, server/client boundary, data fetching |
| React SPA with Redux Toolkit | State flow from UI event to store to API |
| pnpm/Turborepo monorepo | Workspace resolution, choosing scope |
| CLI or library (no UI) | Entry via `bin`/exports, public API teaching |
| Poorly documented legacy JS | Honest uncertainty, open questions |

Run the full suite on every prompt/pipeline change in CI (nightly for the large repos), store results per pipeline version, and block releases on regressions in validity or fabrication.

### 8.5 Tutorial content format

Hybrid storage (section 6): one immutable, schema-versioned JSON document per tutorial version, plus normalised source references and progress. Stable keys (`chapterKey`, `lessonKey`, `questionKey`, `refId`) make partial regeneration, progress carry-over and version diffs possible.

```ts
// packages/contracts/src/tutorial/content.ts (abridged)
export const SourceRef = z.object({
  path: z.string(), startLine: z.number().int().positive(), endLine: z.number().int().positive(),
  blobSha: z.string(), symbolKey: z.string().optional(),
})
const Evidence = z.object({ refId: z.string(), note: z.string().optional() })
export const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('prose'), md: z.string(), kind: z.enum(['observed', 'interpretation']), evidence: z.array(Evidence) }),
  z.object({ type: z.literal('code'), refId: z.string(), highlight: z.array(z.tuple([z.number(), z.number()])).optional(), caption: z.string() }),
  z.object({ type: z.literal('diagram'), mermaid: z.string(), nodeRefs: z.record(z.string(), z.string()), caption: z.string() }),
  z.object({ type: z.literal('callout'), tone: z.enum(['note', 'warning', 'tip']), md: z.string() }),
  z.object({ type: z.literal('exercise'), prompt: z.string(), hints: z.array(z.string()), solutionRefs: z.array(z.string()) }),
])
export const Question = z.object({
  key: z.string(), prompt: z.string(),
  options: z.array(z.object({ key: z.string(), text: z.string() })).min(3).max(5),
  correct: z.string(), explanation: z.string(), evidence: z.array(Evidence).min(1),
})
export const Lesson = z.object({ key: z.string(), title: z.string(), minutes: z.number(), blocks: z.array(Block), quiz: z.array(Question).optional() })
export const Chapter = z.object({ key: z.string(), title: z.string(), summary: z.string(), objectives: z.array(z.string()), prerequisites: z.array(z.string()), lessons: z.array(Lesson) })
export const TutorialContent = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({ title: z.string(), repo: z.object({ owner: z.string(), name: z.string(), commitSha: z.string() }),
    audience: z.enum(['newcomer', 'intermediate', 'expert']), objectives: z.array(z.string()), prerequisites: z.array(z.string()) }),
  chapters: z.array(Chapter),
  sourceRefs: z.record(z.string(), SourceRef),
  furtherReading: z.array(z.object({ refId: z.string(), why: z.string() })),
  openQuestions: z.array(z.string()),
})
```

Evolution rules: additive optional fields within `schemaVersion: 1`; breaking changes bump the version and ship an `upgrade(v1) → v2` function applied on read; version comparison diffs chapters and lessons **by key**, giving a "what changed since you last studied" view.

### 8.6 Sample lesson (illustrative repository)

The repo `acme/shopfront` (Next.js App Router + Redux Toolkit + REST API) is hypothetical; paths and lines show the shape, not real code.

```json
{
  "key": "ch3-l2",
  "title": "What happens when a shopper clicks \"Add to cart\"",
  "minutes": 12,
  "blocks": [
    { "type": "prose", "kind": "observed",
      "md": "The button in `ProductCard` dispatches the `addItem` thunk instead of calling the API directly, so every cart change flows through the store.",
      "evidence": [{ "refId": "r1" }, { "refId": "r2" }] },
    { "type": "code", "refId": "r1", "highlight": [[18, 22]], "caption": "The click handler dispatches the thunk" },
    { "type": "prose", "kind": "observed",
      "md": "`addItem` posts to `/api/cart/items` through the shared `apiClient`, then the `fulfilled` case in `cartSlice` merges the server's cart into state.",
      "evidence": [{ "refId": "r2" }, { "refId": "r3" }, { "refId": "r4" }] },
    { "type": "diagram", "caption": "Add-to-cart request lifecycle",
      "mermaid": "sequenceDiagram\n  participant UI as ProductCard\n  participant Store as cartSlice\n  participant API as POST /api/cart/items\n  UI->>Store: dispatch(addItem)\n  Store->>API: apiClient.post\n  API-->>Store: updated cart\n  Store-->>UI: re-render via useAppSelector",
      "nodeRefs": { "UI": "r1", "Store": "r3", "API": "r4" } },
    { "type": "prose", "kind": "interpretation",
      "md": "Routing writes through a thunk keeps optimistic-update logic in one place; the repo has no comment confirming this intent.",
      "evidence": [{ "refId": "r3" }] },
    { "type": "exercise", "prompt": "Find where the cart badge count is derived from state and explain why it updates without a refetch.",
      "hints": ["Search for a selector used by the header"], "solutionRefs": ["r5"] }
  ],
  "quiz": [
    { "key": "q1", "prompt": "Which module sends the network request when an item is added?",
      "options": [{ "key": "a", "text": "ProductCard" }, { "key": "b", "text": "the addItem thunk via apiClient" }, { "key": "c", "text": "the Next.js route handler" }],
      "correct": "b", "explanation": "The component only dispatches; the thunk calls apiClient.post.", "evidence": [{ "refId": "r2" }] }
  ]
}
```

Its entries in the version's `sourceRefs` map, e.g. `"r2": { "path": "src/features/cart/thunks.ts", "startLine": 9, "endLine": 27, "blobSha": "…", "symbolKey": "src/features/cart/thunks.ts#addItem" }`, are produced by the validator, not by the model.

### 8.7 Models, providers and costs

| Role | Default (Anthropic, official prices) | Alternatives to benchmark |
| --- | --- | --- |
| Summaries, classification | Claude Haiku 5.5: $0.10 in / $0.50 out per MTok for prompts ≤100K tokens | Gemini Flash / Flash-Lite tiers; OpenAI small tiers |
| Architecture + outline (few, high-leverage calls) | Claude Opus 5.5: $4 / $20 | Claude Sonnet 5.5 (half price) if evals match |
| Lessons, quizzes, diagrams | Claude Sonnet 5.5: $2 / $10; cache reads $0.10 | Gemini Pro tier; OpenAI mid tier |
| Judge (validation sample) | Sonnet 5.5 or Haiku 5.5 | A different vendor to de-correlate errors |

Anthropic rates from the [official pricing page](https://platform.claude.com/docs/en/about-claude/pricing) (fetched 14 Oct 2026): Batch API is 50% off; on Opus 5.5 and Sonnet 5.5 a cache hit costs 5% of input; and Claude 4.7+ models use a tokenizer producing about 30% more tokens for the same text — calibrate estimates with the token-counting endpoint. Competitor prices from secondary trackers, to verify before use: OpenAI lists GPT-5.6 tiers from $0.20/$1.20 (Luna) to $4/$20 (Sol) ([mem0, Oct 2026](https://mem0.ai/library/llms-and-models/openai-api-pricing)); Google lists Gemini 3.1 Pro at $2/$12 under 200K tokens and current Flash models at $0.75/$3.75 through 31 Dec 2026 ([laozhang blog citing Google](https://blog.laozhang.ai/en/posts/gemini-api-pricing.md), [BenchLM](https://benchlm.ai/google/api-pricing)). Choose by your eval results, not list price.

**Cost per tutorial (estimate).** Assumptions: small = 150 source files (\~150K code tokens), medium = 1,000 files (\~1M), large = 5,000 files (cap). File summaries only for central files (100 / 300 / 600). Chapters 6 / 8 / 10, one Sonnet call per chapter with \~30% extra input from tool rounds and \~12K output including reasoning; shared prefix cached. Judge: 4 / 6 / 8 Sonnet calls. 20% of chapters need one repair. 10% retry overhead. Prices as above.

| Stage (model) | Small | Medium | Large |
| --- | --- | --- | --- |
| File summaries (Haiku 5.5) | $0.03 | $0.10 | $0.23 |
| Architecture model (Opus 5.5) | $0.32 | $0.44 | $0.60 |
| Outline (Opus 5.5) | $0.30 | $0.44 | $0.60 |
| Lessons + quizzes (Sonnet 5.5) | $1.19 | $1.79 | $2.50 |
| Validation judge (Sonnet 5.5) | $0.24 | $0.36 | $0.48 |
| Repairs | $0.24 | $0.36 | $0.50 |
| Retry overhead (10%) | $0.23 | $0.35 | $0.49 |
| **Total per tutorial** | **≈ $2.55** | **≈ $3.85** | **≈ $5.40** |

Levers, in order of impact: (1) reuse public-repo tutorials across users (cost → \~0 for repeat imports); (2) Sonnet instead of Opus for stages 4–5 (saves \~$0.30–0.60); (3) Batch API for non-interactive regenerations (−50% on those calls); (4) Haiku for lessons if evals hold (lesson stage cost drops \~20×). These are **estimates**; measure real token counts in the first 50 runs and replace this table.

### 8.8 Provider-independent abstraction

`packages/ai` exposes roles, not vendors. Business code asks for `author` or `judge`; a registry maps roles to an ordered list of models with prices; every call checks the job budget first and records usage after.

```ts
// packages/ai/src/generate.ts
import { generateText, Output } from 'ai' // AI SDK 6
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import type { z } from 'zod'
import { registry, type ModelRole, type ModelSpec } from './registry'
import { BudgetExceededError, isRetryableProviderError, type Budget } from './budget'

const providers = { anthropic, google, openai }

export async function generateStructured<S extends z.ZodType>(opts: {
  role: ModelRole; schema: S; system: string; prompt: string
  budget: Budget; meta: { jobId: string; stage: string }; signal?: AbortSignal
}): Promise<z.infer<S>> {
  let lastError: unknown
  for (const spec of registry[opts.role]) {           // ordered: primary, then fallbacks
    opts.budget.reserve(estimateCost(spec, opts))     // throws BudgetExceededError before spending
    try {
      const res = await generateText({
        model: providers[spec.provider](spec.id),
        system: opts.system,
        prompt: opts.prompt,
        output: Output.object({ schema: opts.schema }), // validated against the Zod schema
        maxRetries: 2,
        abortSignal: opts.signal,
      })
      await opts.budget.settle(spec, res.usage, opts.meta) // writes llm_calls, updates spent_micros
      return res.output
    } catch (err) {
      opts.budget.release()
      if (err instanceof BudgetExceededError || !isRetryableProviderError(err)) throw err
      lastError = err                                   // 429/5xx/overloaded: try next model
    }
  }
  throw lastError
}

declare function estimateCost(spec: ModelSpec, o: { system: string; prompt: string }): number
```

Notes: AI SDK 6 replaced `generateObject` with `generateText` + `Output.object` ([AI SDK 6 summary](https://lobehub.com/skills/openclaw-skills-ai-sdk-core)); keep prices in configuration, not code, because they change monthly; every fallback model must pass the eval suite before it enters the registry, because structured-output behaviour differs by vendor; for private repos, use only providers whose API terms exclude training on your data, and list them as sub-processors.

### 8.9 Model choice, BYOK and free-model mode

Every tutorial runs under one **run source** chosen before the job starts. The pipeline and the grounding validator are identical for all of them; only model routing, limits and who pays change — so a weaker model yields a shorter or "Draft" tutorial, never an ungrounded one.

| Run source | Who pays tokens | Models | Limits | Notes |
| --- | --- | --- | --- | --- |
| **Free credits** (platform pool) | Nobody — OpenRouter `:free` models | A short allow-list of free models that pass the eval gate | Free models: 20 requests/min and 50/day, or 1,000/day once the account has bought $10 of credits — **per OpenRouter account**, so shared by all your free users ([OpenRouter pricing](https://openrouter.ai/pricing)) | Public repos only (some free endpoints may log prompts — 11.4); "lite" pipeline below |
| **BYOK — OpenRouter key** | The user | Any OpenRouter model, including free ones under the user's own daily cap | The user's own account limits | Best free path for heavy users: each gets their own 50 or 1,000 free requests/day |
| **BYOK — Anthropic / OpenAI / Google key** | The user | That provider's models | Provider rate limits | Native prompt caching; no gateway hop |
| **Credits** (prepaid wallet) | The user, at cost + \~15% | Presets via the platform's OpenRouter key | Wallet balance | For users who want frontier quality without managing keys |

| Preset | Planner (architecture + outline) | Author (lessons, quiz) | Summarizer | Typical cost per tutorial (estimate) |
| --- | --- | --- | --- | --- |
| Free | Best allow-listed free model | Same | Deterministic summaries only | $0, \~8–15 requests |
| Budget | Claude Haiku 5.5 | Claude Haiku 5.5 | Claude Haiku 5.5 | \~$0.10–0.50 |
| Balanced | Claude Sonnet 5.5 | Claude Sonnet 5.5 | Claude Haiku 5.5 | \~$2.20–4.70 |
| Quality | Claude Opus 5.5 | Claude Sonnet 5.5 | Claude Haiku 5.5 | \~$2.55–5.40 (8.7) |
| Custom | Any catalogue model whose metadata advertises structured outputs or tool calling | Same | Same | Estimated before the run from catalogue prices |

The Anthropic models in the presets are defaults for BYOK-Anthropic and credits; an OpenRouter or OpenAI/Google key maps each preset to that catalogue's equivalent tier. The estimate shown to the user is computed from the static index (files, chapters) and the chosen models' prices, and becomes the job's default budget ceiling.

**Lite pipeline for free models** (smaller context windows, slower responses, weaker structured output, and every call spends the request quota):

- No per-file LLM summaries — use deterministic ones (exports, imports, doc comments, adapter output).
- Architecture model and outline merged into one call; at most 5 chapters; one call per chapter including its quiz; at most one repair.
- Small public repos only (e.g. ≤ 300 included source files).
- About **8–15 requests per tutorial**, so a 1,000-request daily pool funds roughly 65–125 lite tutorials a day across all free users; the default per-user allowance is 1 per day.
- If a model lacks native structured output, request JSON in the prompt, parse with Zod, repair once; drop models from the allow-list when nightly evals fail.

```ts
// packages/ai/src/resolve.ts — pick the client for a job; business code only sees roles
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export function modelFor(run: RunContext, modelId: string) {
  switch (run.source) {
    case 'free':
      if (!modelId.endsWith(':free')) throw new Error('free pool only runs :free models')
      return createOpenRouter({ apiKey: env.OPENROUTER_FREE_POOL_KEY }).chat(modelId)
    case 'credits':
      return createOpenRouter({ apiKey: env.OPENROUTER_CREDITS_KEY }).chat(modelId)
    case 'byok': {
      const key = run.decryptedKey // decrypted in the worker for this job only; never logged or persisted
      switch (run.provider) {
        case 'openrouter': return createOpenRouter({ apiKey: key }).chat(modelId)
        case 'anthropic':  return createAnthropic({ apiKey: key })(modelId)
        case 'openai':     return createOpenAI({ apiKey: key })(modelId)
        case 'google':     return createGoogleGenerativeAI({ apiKey: key })(modelId)
      }
    }
  }
}
```

Rules: a failing BYOK key **never falls back to a platform key**; free-pool jobs never fall back to paid models unless the ad-funded pool explicitly allows it; base URLs are fixed per provider (users cannot point keys at arbitrary endpoints); provider package names and options should be checked against the AI SDK 6 versions you pin.

## 9. Background processing and reliability

Release 1 uses a **Postgres-backed queue (pg-boss)**, not Redis: the workload is a few hundred to a few thousand long, expensive jobs a day, where correctness matters far more than throughput, and enqueuing **in the same transaction** as the job row removes the classic dual-write bug. `generation_jobs` is the durable truth, each stage is **checkpointed** so retries resume where they failed, and progress reaches the browser over **SSE** replayed from `job_events`.

### 9.1 Queue options

| Criterion | pg-boss (Postgres) | BullMQ (Redis) | Trigger.dev / Inngest (durable execution) | Temporal |
| --- | --- | --- | --- | --- |
| Persistence | Postgres (backed up with everything else) | Redis; durability depends on your AOF/RDB settings and a `noeviction` memory policy | Platform-managed | Platform or self-hosted cluster |
| Enqueue atomically with business data | **Yes** — same DB transaction | No — needs an outbox or reconciliation | No — event send after commit | No |
| Retries, backoff, DLQ, priorities, singleton | Yes (retries default-on since v10; dead-letter queues) | Yes, richest set | Yes, step-level | Yes, step-level |
| Throughput / latency | Moderate; polling (seconds) | High; sub-second | Platform-dependent | High |
| Extra infrastructure | None | Redis | A vendor (Trigger.dev Cloud runs your code on its compute) | Heavy |
| Private source code stays on your infra | Yes | Yes | Inngest: yes (orchestrates only); Trigger.dev Cloud: no unless self-hosted | Yes if self-hosted |

Sources: [pg-boss npm](https://npmjs.com/package/pg-boss) (transactional job creation, priorities, DLQ, backoff), [pg-boss v10 release notes](https://www.github.com/timgit/pg-boss/releases), [Inngest's category overview](https://www.inngest.com/blog/best-job-queue-alternatives) (queues vs durable execution; Trigger.dev Cloud runs your code).

Role split: **Postgres** is the system of record for job status, stage outputs, budgets and events. **The queue only delivers work**, at-least-once. Neither gives exactly-once side effects, so every stage is idempotent.

Triggers to add Redis/BullMQ (or a durable-execution platform): sustained queue latency above your SLO; job volume where polling load shows up in database CPU; need for distributed rate limiting across many workers; or multi-step workflows with long waits (human review, scheduled re-generation) that you would otherwise hand-build.

### 9.2 Job state machine

```mermaid
stateDiagram-v2
  [*] --> queued: enqueue (same tx as job row)
  queued --> running: worker claims
  running --> succeeded: publish committed
  running --> waiting_retry: retryable error
  running --> stalled: heartbeat lost
  stalled --> waiting_retry: reaper
  waiting_retry --> running: backoff elapsed (resume at last checkpoint)
  running --> failed: non-retryable, attempts exhausted, or budget exceeded
  queued --> canceled: user cancels
  running --> canceling: user cancels
  waiting_retry --> canceled: user cancels
  canceling --> canceled: worker observes abort
  succeeded --> [*]
  failed --> [*]
  canceled --> [*]
```

Stage progress is separate from job status: a small `job_stages` table (`job_id`, `stage`, `status`, `attempt`, `output_key`, `output_hash`, timestamps) stores each stage's checkpoint, with outputs in object storage.

### 9.3 Reliability mechanics

| Concern | Mechanism |
| --- | --- |
| Duplicate requests | Client sends an idempotency key; unique (`user_id`, `idempotency_key`) returns the existing job |
| Duplicate delivery | `claim()` is a conditional update (`queued`/`waiting_retry`/`stalled` → `running`); anything else is a no-op |
| Retries | Error classification: retryable (429, 5xx, overloaded, timeouts, network) vs terminal (access revoked, repo too large, budget exceeded, invalid input); exponential backoff with jitter; `retry-after` respected |
| LLM schema failures | One repair attempt with the validation errors; then fail the stage |
| Timeouts | Per-stage timeout + whole-job deadline; one `AbortSignal` threads into every LLM and HTTP call |
| Crashes | Heartbeat every \~15 s; a reaper every minute moves `running` jobs with stale heartbeats to `stalled` → re-enqueue; checkpoints mean completed stages are skipped |
| Cancellation | API sets `canceling`; the heartbeat loop sees it and aborts; unspent quota is released |
| Concurrency | Per-process job concurrency; one active free job per user, more with BYOK or credits; per-provider semaphore in `packages/ai` |
| Priorities | BYOK and credit jobs above free-pool jobs via queue priority |
| Dead letters | Exhausted jobs → `failed` with `error_code`; queue DLQ copy for inspection; alert on rate |
| Cost runaway | Budget reserved at enqueue, checked before each LLM call, settled at end; hard stop at ceiling |
| Reconciliation | Nightly: jobs vs queue state, reserved vs settled spend, orphaned stage outputs |

### 9.4 Representative code

```ts
// apps/api/src/jobs/schemas.ts — internal to the backend, not in contracts
export const STAGES = ['ingest', 'index', 'summaries', 'architecture', 'outline', 'lessons', 'validate', 'publish'] as const
export const GenerateTutorialV1 = z.object({
  v: z.literal(1),
  jobId: z.uuid(), userId: z.string(), snapshotId: z.uuid(),
  audience: z.enum(['newcomer', 'intermediate', 'expert']),
})
export const GenerateTutorialPayload = z.discriminatedUnion('v', [GenerateTutorialV1])
export type GenerateTutorialPayload = z.infer<typeof GenerateTutorialPayload>
```

```ts
// apps/api/src/modules/generation/generation.service.ts — enqueue atomically
export async function enqueue(db: Db, boss: PgBoss, req: EnqueueRequest) {
  return db.transaction(async (tx) => {
    const existing = await jobsRepo(tx).findByIdempotencyKey(req.userId, req.idempotencyKey)
    if (existing) return toDto(existing)
    const job = await jobsRepo(tx).insert({ ...req, status: 'queued', budgetMicros: req.plan.budgetMicros })
    const payload = GenerateTutorialPayload.parse({ v: 1, jobId: job.id, userId: req.userId,
      snapshotId: req.snapshotId, audience: req.audience })
    await boss.send('generate-tutorial', payload, {
      singletonKey: job.id, priority: req.plan.source === 'free' ? 0 : 10,
      retryLimit: 3, retryDelay: 30, retryBackoff: true,
      db: pgBossExecutor(tx), // pg-boss creates the job inside this transaction
    })
    return toDto(job)
  })
}
```

```ts
// apps/api/src/jobs/generate-tutorial.worker.ts
export async function handleGenerateTutorial(raw: unknown, deps: WorkerDeps) {
  const p = GenerateTutorialPayload.parse(raw)        // never trust queued data
  const job = await deps.jobs.claim(p.jobId)           // null => duplicate, canceled or finished
  if (!job) return
  const hb = deps.jobs.startHeartbeat(job.id)          // updates heartbeat_at; aborts hb.signal on cancel
  try {
    for (const stage of STAGES) {
      if (await deps.stages.isComplete(job.id, stage)) continue // resume from checkpoint
      await deps.events.emit(job.id, { type: 'stage_started', stage })
      const output = await withTimeout(STAGE_TIMEOUT_MS[stage], hb.signal,
        (signal) => stageHandlers[stage]({ job, payload: p, signal, budget: deps.budgetFor(job) }))
      await deps.stages.complete(job.id, stage, output)         // idempotent upsert
      await deps.events.emit(job.id, { type: 'stage_completed', stage, progress: PROGRESS[stage] })
    }
    await deps.jobs.succeed(job.id)
  } catch (err) {
    const e = classifyError(err)                         // { code, retryable, detail }
    await deps.events.emit(job.id, { type: 'error', code: e.code })
    if (e.code === 'CANCELED') return deps.jobs.markCanceled(job.id)
    if (e.retryable && job.attempts < MAX_ATTEMPTS) {
      await deps.jobs.markWaitingRetry(job.id, e)
      throw err                                          // hand back to pg-boss for backoff
    }
    await deps.jobs.fail(job.id, e)                      // terminal: release unspent quota, notify
  } finally {
    hb.stop()
  }
}
```

```sql
-- Reaper, scheduled every minute: recover crashed workers
UPDATE generation_jobs
SET status = 'stalled', error_code = 'HEARTBEAT_LOST'
WHERE status = 'running' AND heartbeat_at < now() - interval '2 minutes'
RETURNING id; -- each id is re-sent with singletonKey = id and resumes at its last checkpoint
```

(pg-boss option names follow its v10 API; confirm against the version you pin.)

### 9.5 Progress delivery

| Option | Fit | Cost |
| --- | --- | --- |
| Polling every 2–3 s | Works everywhere; slightly laggy; wasteful at scale | Trivial |
| **Server-sent events** | One-way server→client is exactly the need; auto-reconnect with `Last-Event-ID`; plain HTTP | Low |
| WebSockets | Bi-directional, not needed; stickier infra | Higher |

**Decision: SSE** at `GET /jobs/:id/events`. Each event's `id` is the `job_events.id`, so a reconnect replays exactly what was missed; the API checks for new rows about once a second per open stream (or wakes on `LISTEN/NOTIFY` over a direct, non-pooled connection); a comment line every \~15 s keeps proxies from closing idle streams. The client falls back to TanStack Query polling if the stream fails. oRPC can also expose this as a typed event iterator over SSE. Host the API where long-lived responses are allowed (see section 12).

## 10. Interactive learning experience

The **learning player is the product**: outline on the left, the lesson in the centre, commit-pinned source on the right, quiz at the end of each lesson. Release 1 **highlights and links code but never executes it**; execution is a later, separately isolated feature only if users prove they need it.

### 10.1 Information architecture

| Route | Screen | Release 1 |
| --- | --- | --- |
| `/` (product) | Dashboard: in-progress tutorials, recent imports, import CTA | Yes |
| `/import` | Paste URL or pick from installed repos → pre-flight → choose run source (free / your key / credits) and model preset, with estimated cost | Yes |
| `/jobs/:jobId` | Staged progress (SSE), cancel, failure reason | Yes |
| `/t/:owner/:repo/:slug` | Tutorial overview: architecture diagram, outline, objectives, version picker, share | Yes |
| `/t/…/learn/:chapterKey/:lessonKey` | Learning player | Yes |
| `/t/…/code?path=&L=` | Source explorer at the pinned commit | Yes (read-only, files cited by the tutorial + tree) |
| `/t/…/architecture` | Interactive subsystem / dependency explorer | Later |
| `/t/…/ask` | Contextual tutor chat | After validation |
| `/t/…/history` | Versions and "what changed" | After validation |
| `/settings/{profile,github,keys,models,credits}` | Account, GitHub installations, API keys (BYOK), model presets, free and paid credits | Yes (top-ups later) |
| `/u/:username` | Public profile listing your published tutorials | Later |

Public tutorials (`visibility = public`) render server-side with Open Graph images, so a shared link previews well and can be indexed.

### 10.2 Learning player

- **Layout:** shadcn Resizable panels — outline (collapsible), lesson, source. On narrow screens the source panel becomes a bottom Drawer opened from each code reference.
- **Source panel:** Shiki-highlighted file at the pinned commit, cited range highlighted and scrolled into view, breadcrumb, "Open on GitHub" permalink (`/blob/<sha>/<path>#Lx-Ly`).
- **Blocks:** prose (observed vs interpretation styling), code, diagram, callout, exercise; every evidence chip opens its source range.
- **Navigation:** URL holds chapter, lesson and active reference; keyboard shortcuts for next/previous lesson and next reference; command palette (shadcn Command) to jump to any chapter, file or symbol.
- **Quiz:** radio-group questions after each lesson; explanation reveals the cited code; attempts saved.
- **Progress:** a lesson completes when its end is reached and its quiz attempted; optimistic updates via TanStack Query; resume opens the last unfinished lesson. Stable lesson keys carry progress to a regenerated version when the lesson is unchanged.

### 10.3 Highlight vs edit vs execute

| Level | Technology | Risk | When |
| --- | --- | --- | --- |
| **Highlight** | Shiki to static HTML (server or build time) | Low — output is escaped text | Release 1 |
| **Edit (no run)** | CodeMirror 6 scratch editor for exercises | Low — nothing runs | After validation |
| **Execute in the browser** | Sandpack-style bundler in a cross-origin iframe, or WebContainers (check commercial licensing) | Medium — runs in the learner's browser, never on your servers | Later, for **generated self-contained snippets** only |
| **Execute on servers** | Firecracker microVM sandboxes: E2B, Vercel Sandbox (GA Jan 2026, single US region at last report), or self-hosted Firecracker | High — remote code execution by design | Only with strong evidence |

Sources: [Northflank comparison](https://northflank.com/blog/e2b-vs-vercel-sandbox), [Vercel KB](https://vercel.com/kb/guide/vercel-sandbox-vs-e2b), [DEV overview](https://dev.to/alexcloudstar/sandboxing-ai-generated-code-e2b-vs-vercel-sandbox-vs-modal-vs-daytona-in-2026-3c7g) — the last makes the key point that a default Docker container is not a sandbox for adversarial code.

If server execution is ever added, the isolation model is: one microVM per session in a **separate cloud account**; no credentials or tokens inside; network egress denied by default (optionally a read-only package mirror); about 1 vCPU, 512 MB–1 GB RAM, 30–60 s wall time per run, 15-minute session cap, size-capped ephemeral disk; per-user rate limits and spend caps; and **never the user's private repository with its dependencies installed** — run small generated examples instead. The API and generation workers never execute repository code (section 11).

### 10.4 Diagrams and graphs

- **Mermaid:** lazy-loaded on the client (it is heavy), `securityLevel: 'strict'`, themed for light/dark, with the source text as a fallback and accessible description. The worker has already validated the syntax and node references before publish.
- **Interactive dependency graph (later):** React Flow (xyflow) or Cytoscape with an ELK layout, fed from `file_edges` and collapsed by subsystem; cap visible nodes and expand on demand.

### 10.5 Performance, accessibility, states

- **Performance:** the API serves a tutorial **per chapter**, not the whole document; prefetch the next lesson; virtualise long source files; Mermaid and CodeMirror load only when visible.
- **Accessibility:** Base UI primitives give keyboard and ARIA behaviour; code blocks are focusable with announced line ranges; diagrams carry a caption plus a text "steps" list; quiz options are a proper radio group; respect reduced-motion; check contrast in both themes.
- **States:** skeletons while loading; specific, actionable errors with retry; banners for "repo changed since this tutorial", "new version available — see what changed", and "draft: lower confidence"; job failures show the stage that failed and whether quota was refunded.

## 11. Security, privacy and trust

The two risks that could end the company are **leaking a customer's private source code** and **executing attacker-controlled code on your infrastructure**; the design answers both structurally — least-privilege read-only GitHub access, strict tenant scoping, and a hard rule that repository content is **untrusted data, never instructions and never executed**.

### 11.1 Threat model

| # | Threat | Impact | Release-1 controls | Enterprise additions |
| --- | --- | --- | --- | --- |
| 1 | Private source exposure (other tenants, logs, providers) | Critical | User-scoped services + cross-user tests; private blobs only via authorised API (no public URLs); no prompt/completion logging for private repos; providers with no-training API terms | RLS; customer-managed keys; zero-retention agreements; data residency |
| 2 | Excessive GitHub permissions | High | Contents + Metadata **read-only**; per-repo selection; no write scopes | Admin-approved installs, audit of access |
| 3 | Leaked private key or installation tokens | Critical | App key in a secret manager; tokens minted per job, **scoped to the single repo** when created, held in memory only, redacted from logs | Key rotation runbook; HSM/KMS signing |
| 4 | Cross-user access (IDOR) | Critical | Authorisation in every service call; `scoped(userId)` helper; 404 on foreign IDs; tests in CI | Postgres RLS as defence in depth |
| 5 | Prompt injection inside repo content | High | Content delimited and labelled as data; generation tools are read-only and snapshot-scoped; output schema-validated; links allowlisted; system inserts code excerpts | Injection red-team suite in evals |
| 6 | Malicious dependencies / install scripts | High | **Never install or run repo dependencies**; own repo uses pnpm 11 `strictDepBuilds` + release-age gate | Dependency review, SBOM |
| 7 | Remote code execution | Critical | No execution of repo code; tree-sitter runs as WASM with per-file timeouts; workers non-root, read-only root FS, `no-new-privileges` | Separate VPC/account for indexers |
| 8 | SSRF | High | Users submit GitHub URLs only; server parses to owner/repo and builds API URLs itself; egress allowlist (GitHub, model APIs, storage, DB) | Egress proxy with audit |
| 9 | Path traversal / archive bombs | High | Section 7.3 extraction rules; byte, entry and ratio caps; patched tar library | — |
| 10 | Poisoned or misleading generated content | Medium | Grounding validation; "interpretation" labelling; commands rendered as text with a warning; report button and takedown | Human review workflow for team tutorials |
| 11 | Unsafe Markdown / XSS | High | Allowlist Markdown renderer, no raw HTML; Mermaid `securityLevel: 'strict'`; strict CSP with nonces | Trusted Types |
| 12 | DoS via huge repos | Medium | Pre-flight caps; streaming abort; per-stage timeouts; per-user concurrency | Dedicated capacity |
| 13 | Abuse of expensive AI operations (OWASP LLM10) | High | Plan quotas; per-job budget; import rate limits; free-tier abuse signals (account age, velocity); global spend kill switch | Contracted spend caps |
| 14 | Webhook spoofing / replay | Medium | HMAC-SHA256 over raw body, constant-time compare; dedupe `X-GitHub-Delivery` | — |
| 15 | Secrets committed in repos, or in our logs | High | Exclude `.env*`; secret-pattern scanner over files before generation; excerpts containing secrets are redacted; structured-log redaction | Customer-defined redaction rules |
| 16 | Unauthorised tutorial access | High | Visibility check on every read; unguessable share tokens; `Cache-Control: private` for non-public pages; OG images only for public tutorials | — |
| 17 | Session / CSRF attacks | Medium | httpOnly, Secure, SameSite=Lax cookies; Origin check on state-changing RPC calls | SSO, session policies |
| 18 | Deletion and revocation not honoured | High | Webhook-driven `revoked_at`, immediate hide, scheduled blob purge; user deletion cascade (section 6.7) | Deletion certificates, audit trail |

OWASP keeps prompt injection at #1 in its 2025 LLM Top 10, distinguishes direct from **indirect** injection via processed content, and broadened denial-of-service into **unbounded consumption** including cost attacks ([Coralogix summary](https://coralogix.com/?p=79971), [Aembit summary](https://aembit.io/blog/owasp-top-10-llm-risks-explained/)). Threats 5 and 13 map to those entries.

### 11.2 Repository content is data, not instructions

- Prompts wrap repository text in clearly labelled data sections and state that instructions inside it must be ignored; this reduces, but **does not prevent**, injection — so safety comes from limiting what a hijacked model can do.
- The model has no side-effecting tools: only read-only `search`, `readRange` and `neighbors` over the current snapshot. It cannot fetch URLs, write data or reach other tenants.
- Everything it returns is parsed against a schema, references are re-resolved by code, links are allowlisted, and the renderer escapes text — so a successful injection can at worst produce a wrong lesson, which validation and the report button catch.
- The system prompt is not treated as a secret or a security control (OWASP LLM07 guidance per [Aembit](https://aembit.io/blog/owasp-top-10-llm-risks-explained/)).

### 11.3 Controls by layer

| Layer | Controls |
| --- | --- |
| API | Better Auth sessions; authorisation per procedure; Zod validation via contracts; rate limits (per IP, per user); idempotency keys; Origin checks; strict CORS to product origin; webhook HMAC |
| Database | Least-privilege roles (API vs worker vs migrator); TLS; per-user scoping; no secrets in rows (tokens never stored); PITR backups; RLS for enterprise |
| Worker | Non-root container; read-only root FS + `noexec` temp volume; egress allowlist; per-job temp dir wiped; no dependency installs; per-stage timeouts and memory limits |
| Model | Read-only snapshot-scoped tools; budgets; output schemas; no private prompts logged; vendor terms checked; injection eval cases |
| Storage | Private buckets; server-side encryption; object keys namespaced by repository; lifecycle deletion; access only through the API, never direct public URLs for private content |
| Deployment | Secrets in the platform secret store; separate staging/prod credentials and GitHub Apps; dependency scanning and pinned images in CI; audit log of admin actions |

### 11.4 BYOK keys, free models and ads

BYOK turns users' API keys into the most valuable secret you hold after GitHub tokens; the free pool and ad scripts add two smaller surfaces.

| Risk | Controls |
| --- | --- |
| Stolen user API keys (database or backup leak) | Envelope encryption: each key encrypted with AES-256-GCM under a data key wrapped by a key-encryption key that lives only in the server's secret store — never in the database or backups; decrypted only in the worker, in memory, for that user's job; never returned by any API (masked `…last4`); logger redaction plus a test that fails if a key-shaped string reaches logs; delete is immediate |
| Platform spending a user's money badly | Estimate before every run; per-job budget ceiling chosen by the user; every call listed in the user's usage view with model, tokens and cost; no retries beyond the stated policy |
| Keys sent to the wrong place | Provider base URLs fixed in code; users cannot supply custom endpoints (also closes an SSRF path); a failing user key never falls back to a platform key |
| Free-model data use | Some free endpoints may log or use prompts ([utilengine](https://utilengine.com/blog/openrouter-free-models/)); the free pool is limited to **public repos** and the UI says so; private repos require BYOK or credits, with providers whose API terms exclude training |
| Free-pool abuse (multi-accounting, scripted imports) | Per-user daily cap; GitHub account-age and velocity checks; per-IP limits; global daily cap with a graceful refusal at pre-flight |
| Third-party ad script on your pages | Ads only on public tutorial pages and the landing site — never in the private player, settings or any page showing private code; strict CSP allow-listing only the ad client; EthicalAds matches ads to page content without cookies or tracking ([EthicalAds](https://www.ethicalads.io/publishers/topics/open-source/)) |

Out of scope by design: team roles, SSO, SCIM and other enterprise controls — this is an individual-developer product.

## 12. Low-cost deployment and observability

Run everything that needs a server on **one 2 vCPU / 4 GB VPS (\~€6–7/month)** with Docker Compose, put **Cloudflare's free plan** in front for DNS, TLS, CDN caching and the static landing page, and use **R2's free tier** for blobs and backups. Fixed platform cost is about €6–7/month plus a domain, with no per-seat, per-service or per-request billing that can grow by surprise.

### 12.1 Topology

```mermaid
flowchart LR
  U[Browser] --> CF[Cloudflare free<br/>DNS, TLS, CDN, WAF]
  CF -->|example.com| L[apps/landing<br/>static export on Cloudflare Pages]
  CF -->|app. and api.| C[Caddy]
  subgraph VPS["One VPS, 2 vCPU / 4 GB, Docker Compose"]
    C --> P[apps/product<br/>Next.js standalone]
    C --> A[API<br/>Fastify + oRPC + SSE]
    W[Worker<br/>pg-boss]
    PG[(Postgres 17<br/>records + queue)]
    A --> PG
    W --> PG
  end
  W --> R2[(R2<br/>blobs + nightly backups)]
  W --> GH[GitHub]
  W --> M[OpenRouter or the<br/>user's own provider]
```

| Component | Where | Monthly cost | Source |
| --- | --- | --- | --- |
| Landing | Next.js `output: 'export'` on Cloudflare Pages | $0 — static asset requests are free and unlimited | [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/platform/functions/pricing/) |
| Product, API, worker, Postgres, Caddy | One VPS, e.g. Hetzner CAX11 (2 Arm vCPU, 4 GB) at €5.99 or CX23 at €5.49, plus €0.50 for IPv4 | ≈ €6–7 | [byteiota](https://byteiota.com/hetzner-june-2026-price-shock/), [Findstack](https://findstack.com/resources/hetzner-price-increase-2026) |
| DNS, TLS, CDN, basic WAF | Cloudflare Free, proxied | $0 | — |
| Blobs and backups | R2: 10 GB, 1M Class A and 10M Class B operations free monthly; then $0.015/GB-month | $0 at launch | [Filebase](https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/) |
| Errors | Sentry free tier | $0 | — |
| Uptime check | A free uptime monitor hitting `/healthz` | $0 | — |
| Domain | Any registrar | \~$1/month amortised | — |

Caveats: Hetzner changed prices four times in 2026 and has at times shown its cost-optimised plans as "currently not available" ([Findstack](https://findstack.com/resources/hetzner-price-increase-2026), [Schmalbach](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/)) — any comparable 4 GB VPS works; choose on availability and region. Oracle Cloud's Always Free tier (4 Arm OCPUs, 24 GB) is the only option that undercuts this, with availability and account-reclamation caveats ([AgentDeals](https://agentdeals.dev/hetzner-pricing-2026)). Vercel Hobby is free but personal-use only, so it stops fitting once ads or top-ups exist ([Makerkit](https://makerkit.dev/blog/tutorials/vercel-cost)). Cloudflare Workers' free plan allows 100,000 requests/day ([Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/index.md)) but cannot host the long-running worker, so here it serves only the static landing.

| Process | Memory budget (estimate) |
| --- | --- |
| Postgres 17 (`shared_buffers` ≈ 512 MB) | 0.6–1.0 GB |
| Worker (tarball extraction + tree-sitter), concurrency 1–2 | 0.5–1.5 GB peak |
| Next.js product (standalone) | \~0.25 GB |
| API | \~0.2 GB |
| Caddy + OS | \~0.35 GB |

That fits 4 GB with a 2 GB swap file and worker concurrency of 1–2; the per-job repo caps in section 7.3 keep peaks bounded.

### 12.2 Environments

| Environment | Where | Notes |
| --- | --- | --- |
| Local | Docker Compose (section 15.3) | Free models or your own key |
| Staging | Same VPS, separate Compose project, database and GitHub App, behind basic auth | $0 extra; skip until there are real users |
| Production | The VPS | Nightly backups to R2, monthly restore drill |

Per-PR preview environments are skipped to save cost; CI plus staging covers it.

### 12.3 CI/CD

1. **PR:** `pnpm install --frozen-lockfile` → `turbo run lint typecheck test build --affected` → migration drift check → eval smoke run on recorded fixtures.
2. **Main:** build images (arm64 if the VPS is Arm) → push to GitHub Container Registry → deploy over SSH: `docker compose pull && docker compose run --rm migrate && docker compose up -d`. A self-hosted panel such as Coolify or Dokploy on the same VPS can replace the SSH step if you prefer push-to-deploy.
3. **Landing:** Cloudflare Pages builds on push.
4. **Nightly:** eval suite on the free-model allow-list (drops failing models) and on one paid preset using your own key with a small budget.

### 12.4 Observability on free tiers

- **Logs:** pino JSON to stdout, Docker log rotation; never source code, private-repo prompts or keys.
- **Errors:** Sentry free tier for product, API and worker.
- **Dashboard:** an admin-only page in the product reading `generation_jobs`, `job_stages`, `llm_calls`, `free_pool_daily` and `credit_ledger` — no metrics vendor needed yet.
- **Alerts** (email or chat webhook from a small scheduled job in the worker): free pool > 80% used; job failure rate > 20% in an hour; oldest queued job > 15 minutes; disk > 80%; backup failed; credit-funded spend above its daily cap.
- **Later:** OpenTelemetry traces when you split processes across servers.

### 12.5 Growth path

| Signal | Step |
| --- | --- |
| Worker saturates CPU or RAM | Second small VPS running only the worker (same image) |
| Database downtime or backup burden becomes unacceptable | Move Postgres to Neon Launch (\~$19/month for 0.25 CU always on, [Neon](https://neon.com/pricing)) |
| Public tutorial traffic grows | Cache public pages at Cloudflare with `s-maxage`, purge on publish |
| You want managed DX over cost | Product to Vercel Pro ($20/month), API and worker to Railway or Render |

Move on signals from the dashboard, not on user counts.

## 13. Cost model: free tier, BYOK, credits and ads

**The platform should pay for almost nothing per tutorial.** Each developer chooses who pays: their own key (BYOK — $0 to you), a daily free allowance on OpenRouter's free models ($0 in tokens, capped by request quotas), or small prepaid credits sold close to cost. Ads on public tutorial pages are a **cost offset, not a business model**: every ad dollar goes into a pool that funds free-tier tutorials. At launch the only fixed cost is the \~€6–7/month server.

### 13.1 Known prices vs estimates

| Item | Value | Status |
| --- | --- | --- |
| OpenRouter free models | $0 per token; 20 requests/min; 50/day, or 1,000/day after a one-time $10 credit purchase — per OpenRouter account | Published ([OpenRouter](https://openrouter.ai/pricing), [help centre](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know)) |
| OpenRouter credits | 5.5% fee on credit purchases; model prices pass through | Published, via [WhichDevTool](https://whichdevtool.com/tools/openrouter/) |
| OpenRouter BYOK | No fee up to $25,000 of list-price inference/month on standard plans, then 5% | Published ([OpenRouter](https://openrouter.ai/pricing)) |
| Claude Haiku / Sonnet / Opus 5.5 | $0.10/$0.50 (≤100K prompt) · $2/$10 · $4/$20 per MTok | Published ([Anthropic](https://platform.claude.com/docs/en/about-claude/pricing)) |
| EthicalAds | Most publishers earn $2.25–2.75 per 1,000 pageviews at a 70% revenue share, assuming mostly North American and Western European traffic; developer sites with 50k+ monthly pageviews; one ad per page, outside the reading flow | Published ([calculator](https://www.ethicalads.io/publishers/calculator/), [publisher guide](https://www.ethicalads.io/publisher-guide/)) |
| Card payments | e.g. 2.9% + 30¢ per US card charge, +1.5% international | Published, via [Pelcro](https://www.get.pelcro.com/tools/stripe-fee-calculator) |
| Server, Cloudflare, R2 | ≈ €6–7/month; $0; $0 at launch | Published (section 12) |
| Lite free tutorial ≈ 8–15 requests; Budget ≈ $0.10–0.50; Balanced ≈ $2.20–4.70; Quality ≈ $2.55–5.40 | — | **Estimates** (8.7, 8.9) |

### 13.2 Who pays for what

| Run source | Platform token cost | Limit | For |
| --- | --- | --- | --- |
| Free credits | $0 | 1 lite tutorial/day per user (small public repos); global pool \~1,000 requests/day | Trying it, students |
| BYOK on the user's own free OpenRouter key | $0 | The user's own 50 or 1,000 free requests/day | Heavy free users |
| BYOK, paid models | $0 | The user's own budget | Frontier quality, private repos |
| Credits | At cost + \~15% | Wallet balance | Users who don't want to manage keys |

When the global pool runs out, the product says when it resets (00:00 UTC) and shows a two-minute guide to creating a free OpenRouter key — which moves that user onto their own quota permanently. The one-time $10 OpenRouter purchase that lifts the platform cap to 1,000/day stays usable as credit.

### 13.3 Top-up credits that stay reasonable

- **Dollars, not plans:** the wallet shows a dollar balance; each job shows its estimate first and charges actual tokens × list price × 1.15.
- **Packs:** $10 and $20, no subscription, no expiry for 12 months. Skip a $5 pack — the fixed card fee makes it uneconomic.
- **Why 15%:** on a $10 pack, the card fee is about $0.59 and buying the matching $8.70 of OpenRouter credit costs about $9.18 with its 5.5% fee — leaving \~$0.23 for failed jobs. If your payment provider charges more (merchants of record that handle global sales tax usually do), use \~20%.
- **Expect few buyers:** with BYOK and free credits available, top-ups are a convenience, not a revenue line.

### 13.4 Ads: an offset for AI cost, not a business model

- **Placement:** one EthicalAds unit on public tutorial pages and the landing site; nothing in the private learning player, settings or any page with private code.
- **Eligibility:** EthicalAds looks for developer sites with 50k+ monthly pageviews ([publisher guide](https://www.ethicalads.io/publisher-guide/)); until then show house ads ("Bring your own key", "Star us on GitHub").
- **Revenue math (estimate):** at \~$2.50 per 1,000 pageviews, 50k pageviews/month ≈ $125, 100k ≈ $250, 1M ≈ $2,500 — lower if most readers are outside North America and Western Europe. Developer audiences block ads heavily; EthicalAds being on the Acceptable Ads list helps ([FAQ](https://www.ethicalads.io/publishers/faq/)).
- **What it buys:** $125/month funds roughly 250–1,250 Budget-preset tutorials or \~25–50 Quality ones. That makes ads a good way to **upgrade free users from `:free` models to the Budget preset**, nothing more.
- **No "watch an ad for credits":** rewarded formats conflict with EthicalAds' one-unobtrusive-ad rules and Acceptable Ads standards, pay little for this audience, and invite fraud against your free pool.
- **Accounting:** each month's payout goes to `ad_revenue_monthly`, then raises the next month's `paid_budget_micros` for the free pool — so ad revenue is spent only on AI cost, automatically.
- **Is this a business model?** No. Covering even a modest AI budget needs hundreds of thousands of monthly pageviews. If revenue ever becomes a goal, sponsored tutorials of OSS projects by devtool companies (EthicalAds reports projects increasingly want sponsors rather than ads, [July 2026 newsletter](https://www.ethicalads.io/blog/2026/07/ethicalads-newsletter-july-2026/)) are a better fit than more ad slots.

### 13.5 Monthly cost scenarios (platform view, estimates)

| Line item | Launch | Growing | Popular |
| --- | --- | --- | --- |
| Monthly active users | 200 | 3,000 | 25,000 |
| Platform-funded free tutorials | \~10/day | Pool cap, \~65–125/day | Pool cap; heavy users on their own keys |
| Platform token cost | $0 | $0 | $0, plus optional ad-funded Budget runs |
| Server(s) | \~€6–7 | \~€12–14 (worker on a second VPS) | \~€30–60 (larger box + 2 workers) |
| Postgres | On the VPS | On the VPS | Neon Launch \~$19–80 |
| R2 | $0 | \~$1–5 | \~$10–30 |
| Cloudflare, Sentry, uptime | $0 | $0 | $0–30 |
| Ad revenue, if accepted | $0 (below 50k pageviews) | \~$50–250 | \~$500–2,500 |
| **Net per month** | **≈ −€7** | **≈ break-even** | **Surplus funds Budget runs for free users** |

One-time: $10 of OpenRouter credit to lift the free cap, plus the domain.

### 13.6 Spend protection

- The platform pays in only two places — the free pool (counted in requests) and credit-funded runs (prepaid) — and both have hard daily caps and a kill switch.
- BYOK jobs carry a user-chosen budget ceiling (default $2 for Balanced) with the estimate shown first.
- A failing user key never falls back to platform money; free jobs never silently upgrade to paid models.
- Per-user daily free cap, GitHub account-age and velocity checks, per-IP limits.
- The cost levers in 8.7 (reuse of public tutorials, caching, routing) still apply to every paid preset.

## 14. Final system architecture

Cloudflare serves the static landing page and proxies `app.` and `api.` to one VPS, where Caddy routes to the Next.js product server and the Fastify API; a worker process (same codebase, same image) runs generation; Postgres on the same box is both the system of record and the job queue. Only the worker talks to GitHub for content, to model providers (OpenRouter's free or credit pool, or the user's own provider key) and to R2.

### 14.1 System diagram

```mermaid
flowchart LR
  B[Browser] --> CF[Cloudflare free<br/>DNS, TLS, CDN]
  CF --> L[apps/landing<br/>static export on Cloudflare Pages]
  CF --> CA[Caddy]
  subgraph VPS["One VPS, Docker Compose"]
    CA --> P[apps/product<br/>Next.js standalone]
    CA --> A[API process<br/>Fastify + oRPC + Better Auth<br/>webhooks, SSE]
    W[Worker process<br/>pg-boss: ingest, index,<br/>generate, validate, publish]
    PG[(Postgres 17<br/>records + pg-boss queue)]
    P --> A
    A --> PG
    W --> PG
  end
  GH[GitHub<br/>App API, tarballs, webhooks] -- signed webhooks --> CA
  W -- repo-scoped token --> GH
  W --> R2[(Cloudflare R2<br/>blobs, backups)]
  W --> OR[OpenRouter free or credit pool]
  W --> UK[User's own provider key<br/>OpenRouter, Anthropic, OpenAI, Google]
  A -.-> S[Sentry free]
  W -.-> S
```

### 14.2 End-to-end request flow

```mermaid
sequenceDiagram
  autonumber
  participant U as Learner (product app)
  participant API as API (Fastify/oRPC)
  participant GH as GitHub
  participant DB as Postgres (+ pg-boss)
  participant W as Worker
  participant S as R2
  participant M as Model provider
  U->>API: repositories.import(url, audience)
  API->>API: auth, run-source check (key valid / free pool / wallet), reserve
  API->>GH: resolve ref to SHA, Git Trees (pre-flight)
  API->>DB: tx: insert generation_job + enqueue job
  API-->>U: { jobId, status: queued }
  U->>API: GET /jobs/:id/events (SSE)
  W->>DB: claim job (queued to running)
  W->>GH: mint repo-scoped token, download tarball
  W->>S: store blobs by SHA
  W->>DB: snapshot_files, symbols, file_edges
  W->>M: summaries, architecture, outline, lessons
  W->>W: validate refs, identifiers, diagrams
  W->>DB: tx: tutorial_version + source_refs, job succeeded
  W->>DB: job_events (each stage)
  API-->>U: SSE progress events (replay by Last-Event-ID)
  U->>API: tutorials.getChapter(versionId, chapterKey)
  API->>DB: visibility check, read chapter
  API-->>U: chapter JSON, rendered in the learning player
```

### 14.3 Authentication and authorisation model

| Subject | Authenticated by | Can |
| --- | --- | --- |
| Anonymous visitor | — | Read public tutorials; landing pages |
| Signed-in developer | Better Auth session via GitHub sign-in | Import public repos and repos their GitHub App installation can read; generate with free credits, their own keys or credits; learn; manage their keys, preferences and credits |
| Owner of a tutorial | `tutorials.user_id` | Change visibility, create or revoke share links, delete |
| Worker | Internal database role | Read snapshots it processes; decrypt that job's key in memory; write job outputs |
| GitHub webhook | HMAC signature | Update installation and repository state only |

There are no roles or shared workspaces. Private repository content is readable only by the user whose installation grants access; tutorial visibility is `private` → `link` (unguessable token) → `public`; every check lives in the service layer, never only in the UI.

### 14.4 Mandatory vs optional components

| Mandatory in release 1 | Optional, added on a signal |
| --- | --- |
| Product + landing apps, API, worker | Separate indexer service (section 4.4 triggers) |
| Postgres (records + queue), R2 | Redis/BullMQ or durable-execution platform (9.1 triggers) |
| GitHub App, Better Auth | pgvector embeddings + chat retrieval (evals decide) |
| OpenRouter free pool + BYOK (OpenRouter and direct providers) | Search engine for cross-repo search |
| Sentry, admin dashboard, pool/queue/backup alerts | Code-execution sandbox in a separate account (10.3) |
| Eval harness in CI | Credit top-ups, ads, managed Postgres, second worker server |

## 15. Starter configuration and representative code

The configs below are enough to scaffold the repo and start the first vertical slice; pin exact versions in the lockfile on day one and upgrade deliberately. Earlier sections already hold the contract (5.4), schema (6.8), AI abstraction (8.8), tutorial schema (8.5) and worker (9.4) code.

### 15.1 Versions and compatibility constraints

| Tool | Constraint | Note |
| --- | --- | --- |
| Node.js | 24 LTS | Same major in CI, Docker and local (`engines` + `.nvmrc`) |
| pnpm | 11.x | Supply-chain defaults on; settings live in `pnpm-workspace.yaml` |
| Turborepo | 2.x (2.11 current) | `tasks` schema |
| TypeScript | 6.0 | Avoid 6.0-deprecated options; try `@typescript/native-preview` (7.0) in CI as a non-blocking job |
| Next.js / React | 16.x latest patch / 19.2 | Patch promptly — 16.2.6 alone fixed 13 advisories |
| Tailwind / shadcn | v4 / CLI v4, Base UI | Monorepo template, shared `packages/ui` |
| Fastify / oRPC / Zod | 5.x / 1.x / 4.x | oRPC 2.0 is beta — stay on 1.x |
| Drizzle | 0.45.x + matching drizzle-kit | Move to 1.0 when stable |
| pg-boss | 10.x or later | Confirm option names for the pinned major |
| Better Auth | Latest 1.x | Drizzle adapter, GitHub provider |
| AI SDK | 6.x | `generateText` + `Output.object` |
| web-tree-sitter + grammars | Pin grammar versions together | Bump `analyzer_version` when they change |

### 15.2 Root files

```json
// package.json
{
  "name": "code-tutorial-platform",
  "private": true,
  "packageManager": "pnpm@11.1.3",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @acme/api db:generate",
    "db:migrate": "pnpm --filter @acme/api db:migrate",
    "evals": "pnpm --filter @acme/evals start"
  },
  "devDependencies": { "turbo": "^2.11.0", "typescript": "catalog:" }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
  - tools/*
catalog:            # one version per shared dependency across the repo
  typescript: ^6.0.0
  zod: ^4.0.0
  '@orpc/contract': ^1.0.0
  '@orpc/server': ^1.0.0
  '@orpc/client': ^1.0.0
  drizzle-orm: ^0.45.0
minimumReleaseAge: 4320  # minutes (3 days) — stricter than the 1-day default
strictDepBuilds: true    # install scripts denied unless allow-listed below
allowBuilds:
  esbuild: true          # verify the exact key/shape against your pinned pnpm 11 docs
```

```json
// turbo.json
{
  "$schema": "https://turborepo.dev/schema.json",
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "lint": {},
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

TypeScript strategy: `packages/config/tsconfig.base.json` sets `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`, `skipLibCheck`; `tsconfig.node.json` extends it with `module`/`moduleResolution: NodeNext` for the API and libraries; `tsconfig.next.json` uses `moduleResolution: Bundler`. Shared packages export source (`"exports": { ".": "./src/index.ts" }`), Next.js lists them in `transpilePackages`, and the API is bundled with workspace packages inlined (e.g. tsdown) into one `dist/` for the Docker image. Each package runs `tsc --noEmit` as its `typecheck` task.

### 15.3 Local infrastructure

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: tutorials
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U app -d tutorials']
      interval: 5s
  minio:                      # S3-compatible stand-in for R2
    image: minio/minio
    command: server /data --console-address ':9001'
    environment: { MINIO_ROOT_USER: minio, MINIO_ROOT_PASSWORD: minio12345 }
    ports: ['9000:9000', '9001:9001']
    volumes: ['miniodata:/data']
  redis:                      # not used in release 1; enable when section 9.1 triggers fire
    image: redis:7
    command: ['redis-server', '--appendonly', 'yes', '--maxmemory-policy', 'noeviction']
    profiles: ['later']
    ports: ['6379:6379']
volumes: { pgdata: {}, miniodata: {} }
```

### 15.4 Environment variables

| App | Variables |
| --- | --- |
| api (both processes) | `NODE_ENV`, `PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_COOKIE_DOMAIN`, `PRODUCT_ORIGIN` |
| api — GitHub | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64), `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_SLUG` |
| api — storage | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `BACKUP_BUCKET` (R2) |
| api — models and keys | `OPENROUTER_FREE_POOL_KEY`, `OPENROUTER_CREDITS_KEY`, `KEY_ENCRYPTION_KEY`, `KEY_ENCRYPTION_KEY_VERSION`, `MODEL_CATALOG_PATH` (presets, free-model allow-list, prices) |
| api — limits | `FREE_POOL_DAILY_REQUESTS`, `FREE_TUTORIALS_PER_USER_PER_DAY`, `MAX_FREE_REPO_FILES`, `DEFAULT_BYOK_JOB_BUDGET_USD`, `CREDITS_MARKUP`, `CREDITS_DAILY_CAP_USD`, `WORKER_CONCURRENCY`, `MAX_REPO_FILES`, `MAX_REPO_BYTES` |
| api — observability | `SENTRY_DSN`, `LOG_LEVEL`, `ALERT_WEBHOOK_URL` |
| product | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_ETHICALADS_PUBLISHER`, `API_INTERNAL_URL` |
| landing | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` |
| payments (later) | `PAYMENTS_PROVIDER`, `PAYMENTS_API_KEY`, `PAYMENTS_WEBHOOK_SECRET` |

Each process parses its variables with a Zod schema at boot and exits with a clear message on failure.

### 15.5 API surface (release 1)

| Procedure / route | Kind | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/*` | Better Auth | — | GitHub sign-in, session |
| `me.get` | RPC query | User | Profile, free credits left today, wallet balance, pool status |
| `github.installUrl` / `github.listRepos` | RPC | User | Install the app; list repos it can read |
| `keys.list` / `keys.add` / `keys.validate` / `keys.delete` | RPC | User | BYOK management; `add` validates with a test call; responses only ever include `…last4` |
| `models.catalog` / `models.getPreferences` / `models.setPreferences` | RPC | User | Presets, allow-listed free models, custom per-role models |
| `repositories.preflight` | RPC | User | Size/language check plus estimated requests and cost per preset |
| `repositories.import` | RPC mutation | User | Create job with run source and models (idempotent) — section 5.4 |
| `jobs.get` / `jobs.cancel` | RPC | Job owner | Status; cancel and release reserved credits |
| `GET /jobs/:id/events` | SSE | Job owner | Progress stream with replay |
| `tutorials.list` / `tutorials.get` / `tutorials.getChapter` / `tutorials.getSource` | RPC | Visibility | Own list; overview + outline; one chapter; file content at the pinned commit |
| `tutorials.setVisibility` / `tutorials.createShareLink` | RPC | Owner | Publish, unlist, share |
| `learning.getProgress` / `learning.markLesson` / `learning.submitQuiz` | RPC | User | Progress and attempts |
| `credits.get` / `credits.checkout` (later) | RPC | User | Ledger history; start a top-up |
| `POST /webhooks/github` | REST | HMAC | Installation, repository, push events |
| `POST /webhooks/payments` (later) | REST | Signature | Idempotent top-up crediting |
| `GET /healthz`, `GET /readyz` | REST | — | Liveness and readiness |

The same contract can emit an OpenAPI document via oRPC for internal docs and a future public API.

### 15.6 Testing strategy

| Layer | Tooling | What it proves |
| --- | --- | --- |
| Unit | Vitest | Filters, path safety, module resolution, framework adapters, validators, cost math |
| Fixture repos | Vitest + small committed repos (or tarballs) | Index output snapshots per analyzer version; extraction attack cases (`..`, symlinks, bombs) |
| Contract | Vitest against oRPC router with a test DB | Inputs/outputs/errors match contracts; authorisation and cross-tenant 404s |
| Database | Testcontainers Postgres or a Neon branch | Migrations apply cleanly; quota ledger atomicity under concurrency |
| Worker | Recorded model responses (fixtures) | Stage sequencing, checkpoints, retry/cancel/stall recovery — deterministic, no network |
| Evals | `tools/evals` against real models | Grounding, coverage, fabrication, cost (section 8.4) |
| End-to-end | Playwright | Sign in → import fixture → watch progress → read lesson → quiz → share |
| Security | Semgrep/CodeQL + dependency audit; injection eval cases | Common bug classes; known-vulnerable deps; prompt-injection resistance |

### 15.7 CI workflow (excerpt)

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env: { POSTGRES_USER: app, POSTGRES_PASSWORD: app, POSTGRES_DB: tutorials }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test build --affected
      - run: pnpm db:migrate && pnpm --filter @acme/api db:check-drift
        env: { DATABASE_URL: postgres://app:app@localhost:5432/tutorials }
      - run: pnpm evals -- --suite smoke --fixtures recorded
```

(Action versions shown are illustrative — pin them to commit SHAs in practice.)

## 16. Phased implementation roadmap

Build a **walking skeleton first** (public URL → job → tarball → one validated LLM outline → rendered with working source links) by about week 6, then deepen each stage behind it. Assuming two engineers starting 2 Nov 2026, closed beta lands around late February 2027 and public launch about a month later; one engineer should plan for roughly 1.6–2× these durations.

```mermaid
gantt
  title Release-1 roadmap (assumption: 2 engineers, start 2 Nov 2026)
  dateFormat YYYY-MM-DD
  axisFormat %d %b
  section Critical path
  P0 Foundation                     :p0, 2026-11-02, 14d
  P1 Auth, data, GitHub App         :p1, after p0, 14d
  P2 Queue, ingestion, skeleton     :p2, after p1, 14d
  M1 Walking skeleton               :milestone, m1, after p2, 0d
  P3 Repository analysis            :p3, after p2, 21d
  P5 Generation pipeline            :p5, after p3, 21d
  P6 Validation and grounding       :p6, after p5, 14d
  P8 Hardening, security, VPS deploy :p8, after p6, 14d
  M2 Open beta                      :milestone, m2, after p8, 0d
  P9 Beta and launch prep           :p9, after p8, 28d
  section Parallel
  P4 Eval harness (free + frontier) :p4, after p2, 21d
  P7 Learning UI                    :p7, after p2, 42d
  Landing page and docs             :pl, after p1, 28d
  BYOK vault, free pool, credits    :pb, after p5, 14d
```

Critical path: P0 → P1 → P2 → P3 → P5 → P6 → P8. Parallel tracks start once the contracts from P1–P2 exist: the eval harness (P4) must be ready before prompt tuning in P5, and the UI (P7) builds against recorded tutorial fixtures until real output arrives.

| Phase | Objectives and deliverables (files, packages) | Acceptance criteria and tests | Main risk |
| --- | --- | --- | --- |
| **P0 Foundation** | Monorepo (`pnpm-workspace.yaml`, `turbo.json`, `packages/config`), `packages/ui` with shadcn Base UI, `packages/contracts` skeleton, Docker Compose, CI, Sentry, apps booting | `pnpm dev` runs three apps; CI green; boundary lint rule fails on a forbidden import | Over-building config before features |
| **P1 Auth, data, GitHub** | Drizzle schema + migrations (section 6.8), Better Auth GitHub sign-in, GitHub App install flow, webhook endpoint with HMAC + dedupe, `repositories.preflight` | Sign-in works end to end; install/uninstall webhooks update `github_installations`; forged webhook rejected; cross-user test returns 404 | GitHub App OAuth and cookie domain setup |
| **P2 Queue, ingestion, skeleton** | pg-boss, jobs/stages/events tables, worker entrypoint, SSE endpoint, tarball download + safe extraction, `snapshot_files`; **one** free-model call via OpenRouter producing a validated outline; minimal player page | **M1:** importing a small public repo shows live progress and an outline whose every file link resolves; killing the worker mid-job resumes it; zip-slip/symlink fixtures rejected | Scope creep before the skeleton runs |
| **P3 Repository analysis** | `packages/repo-analysis`: tree-sitter (WASM), symbols, module resolution, Next.js/React Router/Express/Fastify adapters, entry points, tests, graph metrics | Fixture repos produce snapshot-tested indexes; entry points correct on all golden repos; worker stays within the 4 GB server's memory budget | Module-resolution edge cases |
| **P4 Eval harness** (parallel) | `tools/evals`: golden repos with truth sheets, run on the free-model allow-list **and** one frontier preset | Scored report per pipeline version and per model; CI smoke suite under 5 minutes | Truth sheets take longer than expected — start with 10 |
| **P5 Generation pipeline** | `packages/ai` (roles, presets, OpenRouter + direct providers, budgets), full and lite pipelines, tutorial schema v1, publish transaction | Lite pipeline stays within \~15 requests; per-job budget never exceeded in tests; same validator for every model | Free-model quality floor |
| **BYOK, free pool, credits** (parallel) | Encrypted key vault, key validation, model picker and estimate, atomic free-pool and per-user counters, credit ledger (top-ups wired later) | Key never appears in logs or API responses (tests); pool cannot exceed its cap under concurrency; invalid key fails before the job | Key leakage |
| **P6 Validation and grounding** | Reference resolver, identifier checker, flow-hop checker, Mermaid validation, repair loop, confidence + draft status | Reference validity 100% post-validation on every model; fabrication rate tracked per model; injection test repos produce no unsafe links or commands | Over-strict validation drops useful content on weak models |
| **P7 Learning UI** (parallel) | Import flow with run-source picker, job progress, overview, player, quiz, progress, share links, public SSR pages | Playwright journey passes; keyboard-only navigation works; accessibility ≥ 90 on player | Source panel performance on big files |
| **P8 Hardening and deploy** | Section 11 controls, VPS with Docker Compose + Caddy behind Cloudflare, Pages for landing, R2 backups, alerts, restore drill | Threat-model checklist signed off; restore drill completed; alerts fire in a staging chaos test | Single-server failure modes |
| **P9 Beta and launch prep** | Invite developers, interviews, model-quality and cost calibration, house ads; top-ups and EthicalAds only once demand and traffic justify them | Section 3 metrics measured weekly; BYOK adoption and free-pool exhaustion tracked | Weak learner outcomes on free models |

Definition of done for every phase: merged behind tests, deployed to staging, visible on the dashboard, runbook or README updated, and no open critical items from the threat model touching that phase.

## 17. Architecture decision records

Sixteen decisions shape release 1; five of them are expensive to reverse and get full ADRs below. Scores are deliberately omitted: each row states the criteria that decided it and the condition that would reopen it, which is more useful than a weighted number.

### 17.1 Decision matrix

| Decision | Chosen | Alternatives considered | Deciding criteria | Main cost of the choice | Revisit when |
| --- | --- | --- | --- | --- | --- |
| Monorepo tooling | pnpm 11 + Turborepo | Nx, TS project references, pnpm alone | Setup effort, caching, fit for 3 apps | Fewer generators/boundary tools than Nx | > \~15 packages or several teams |
| Frontend framework | Next.js 16 (both apps) | Vite SPA + TanStack Router; Astro for landing | SEO for landing and public tutorials; one mental model | Framework complexity in an app that is mostly client-side | Public pages stop mattering, or Next.js upgrades cost too much |
| Design system | shadcn/ui on Base UI + Tailwind v4 | Ant Design, Radix-based shadcn, MUI | Owned source for the learning player; shared tokens | You maintain copied components | Team prefers a packaged library; heavy data-grid needs |
| Backend framework | Fastify 5 on Node 24 | NestJS, Hono, Elysia/Bun | Maturity, plugins, Node runtime for tree-sitter/tar | Less built-in structure than NestJS | Backend team grows past \~4 engineers |
| API contract | oRPC contract-first + Zod 4 | tRPC, ts-rest, Hono RPC, OpenAPI codegen | Frontend imports contract types only; built-in OpenAPI; typed errors | Younger library; 2.0 migration later | oRPC stalls or 2.0 breaks heavily |
| Database | PostgreSQL | MongoDB, Postgres + separate vector DB | Relational domain, transactions, JSONB, pgvector | Vector scale limits far out | Cross-repo semantic search at large scale |
| DB provider | Postgres 17 on the VPS (Neon later) | Neon, Supabase, RDS | $0 marginal cost; queue polling would keep serverless compute awake | You are the DBA (backups, upgrades) | Downtime or backup burden becomes unacceptable |
| ORM | Drizzle 0.45.x | Prisma 7/8, Kysely | SQL transparency, typed JSONB, no codegen | Pre-1.0 API churn | Drizzle 1.0 GA (upgrade) or stalls |
| Queue | pg-boss on Postgres | BullMQ/Redis, Trigger.dev, Inngest, Temporal | Transactional enqueue, no extra infra, code stays on own infra | Polling latency, lower throughput | Section 9.1 triggers |
| Repository parsing | tree-sitter (WASM) + own module resolution + adapters | scip-typescript / TS language service now, LSP | Speed, error tolerance, no dependency installs | References are syntactic, not proven | Evals show flow claims failing for lack of precise references |
| Retrieval | Graph expansion + lexical + model-guided | Embeddings-first RAG, agentic-only | Precision on identifiers; no stale vector copy of private code | Weaker on vague conceptual queries | Chat evals show semantic misses |
| AI orchestration | Deterministic staged pipeline, bounded agentic steps | Single pass, fully agentic | Debuggability, cost control, reproducibility | More code than one big prompt | A single long-context pass matches eval quality at lower cost |
| Model providers | User's choice per run: free pool (OpenRouter :free), BYOK (OpenRouter or direct), or credits | One platform-paid vendor for everyone | Near-zero platform token cost; user controls quality and cost | Quality varies by model; free models change and are rate-limited | Free models stop passing the eval gate |
| Authentication | Better Auth + GitHub sign-in | Clerk, Auth.js, roll-your-own | Free, self-hosted, TS, Drizzle adapter | You operate auth | Not expected — no teams or SSO in scope |
| Deployment | One VPS (Docker Compose) + Cloudflare free + R2 | Vercel + Railway + Neon, AWS, Fly.io, Cloudflare Workers, Oracle Always Free | Lowest fixed cost (\~€6–7/month), long-running workers, SSE | You patch the server and own backups | One server saturates, or uptime needs exceed one box |
| Progress delivery | SSE with replay from `job_events` | Polling, WebSockets | One-way updates, simple infra, resumable | Needs long-lived connections on API host | Bi-directional collaboration features |

### 17.2 ADR-001 — Modular monolith with separate API and worker processes

- **Context:** generation jobs run for minutes and consume CPU/memory unpredictably; the team is small.
- **Decision:** one `apps/api` package with two entrypoints (`main.http.ts`, `main.worker.ts`) deployed as separate services from one image; module boundaries enforced by lint.
- **Consequences:** independent scaling and crash isolation without distributed-systems overhead; shared code and types; one deploy pipeline.
- **Revisit:** indexing needs different hardware or language; a security boundary (code execution) is required; teams block each other's deploys.

### 17.3 ADR-002 — Postgres-backed queue for release 1

- **Context:** low job volume, high cost per job, correctness over throughput; dual writes between DB and Redis are a common source of lost or phantom jobs.
- **Decision:** pg-boss in the same database, job enqueued inside the transaction that creates the `generation_jobs` row; stage checkpoints in `job_stages`.
- **Consequences:** one stateful system to back up and monitor; seconds of dispatch latency; database stays awake (acceptable).
- **Revisit:** section 9.1 triggers (latency SLO, polling load, distributed rate limiting, long-wait workflows).

### 17.4 ADR-003 — No embeddings in release 1

- **Context:** tutorial generation operates on one snapshot with a full static index; practitioner evidence (Claude Code) and the precision needs of grounding favour lexical and graph retrieval; a vector index is another copy of private code.
- **Decision:** ship with graph expansion + lexical search + model-guided selection; keep pgvector installed and the `chunks` table designed.
- **Consequences:** simpler pipeline and less data to protect; possible recall gaps on conceptual chat questions.
- **Revisit:** eval cases show retrieval misses that embeddings fix, typically when tutor chat launches.

### 17.5 ADR-004 — "The model points, the system quotes"

- **Context:** the core promise is trustworthy explanations; models mis-state line numbers and can invent code.
- **Decision:** models reference symbol keys or short anchor quotes; the validator resolves them to files, ranges and blob SHAs and inserts excerpts; unverifiable claims are repaired once, then downgraded or dropped.
- **Consequences:** zero fabricated code excerpts by construction; more validator engineering; some loss of fluency.
- **Revisit:** never for excerpts; validation strictness tuned by eval results.

### 17.6 ADR-005 — Read-only GitHub access and no execution of repository code

- **Context:** private source code is the most sensitive asset; repositories can contain malicious scripts and injected instructions.
- **Decision:** GitHub App with Contents/Metadata read-only and per-repo token scoping; repositories are never built, installed or run on product infrastructure; any future execution happens only in microVM sandboxes in a separate account, on generated examples.
- **Consequences:** precise type-aware analysis that needs installed dependencies is unavailable; analysis relies on static methods.
- **Revisit:** only with a dedicated isolated indexer design and a security review.

### 17.7 ADR-006 — Individual developers only, with BYOK and a free pool

- **Context:** the audience is individual developers, most of whom will not pay; the founder wants near-zero running cost and no revenue pressure at launch.
- **Decision:** no workspaces, roles or team plans; every tutorial runs under a user-chosen run source (free pool, BYOK or credits); ads only on public pages and only to fund AI cost; everything on one small server.
- **Consequences:** platform token cost ≈ $0; stored user keys become a high-value secret; free-model quality and quotas cap the free experience; little or no revenue.
- **Revisit:** sustained demand for shared or team features, or AI costs that the free pool and ads can no longer cover.

## 18. Risks, unresolved questions and validation experiments

The largest risks are commercial, not technical: a free incumbent adding a "tutorial mode", and individual developers not paying. The technical risk that matters most is tutorial quality on real, messy, medium-to-large repos — which is why the eval harness and a learner-outcome study come before polish.

### 18.1 Risk register

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| DeepWiki, Code Wiki or IDE agents ship guided tutorials | High | High | Lead on grounding guarantees, measurable learning outcomes and model/cost choice ($0 with free models or BYOK) | Competitor changelogs; beta users citing them as "good enough" |
| Quality falls short on large or unusual repos | Medium | High | Sub-directory scoping, golden-set evals by size, draft labelling, honest refusals | Coverage and claim-support scores drop with repo size |
| Cost per tutorial above estimate; heavy users erode margin | Medium | High | Credits by repo size, model routing, reuse, Batch for regenerations | Measured cost > 1.3× section 8.7 |
| Few developers will ever pay | High | Medium | Don't depend on it: BYOK and free credits by design; near-cost top-ups and ads only offset AI spend | Free pool exhausted daily while BYOK adoption stays low |
| Developers hesitate to connect private code | Medium | High | Read-only scoped access, no-training providers, minimal retention, deletion controls, a clear security page | Install-page drop-off; key-security questions from users |
| A hallucinated explanation goes viral | Medium | High | ADR-004, validation, interpretation labels, report button, fast fixes | Reports per 1,000 lesson views |
| Injected content on public pages (spam, harmful commands) | Medium | Medium | Link allowlist, command warnings, moderation before `public` visibility, takedown flow | Reports; outbound-link anomalies |
| Licensing of code excerpts on public tutorials | Medium | Medium | Public tutorials only for repos with an OSI-approved licence (others stay private to the requester); attribution and licence shown; takedown process. Not legal advice — confirm with counsel | Takedown requests |
| Model deprecations or price changes | High | Medium | Role-based registry, eval gate per model change, prices in config | Provider deprecation notices |
| GitHub API or policy changes, rate limits | Low | Medium | Per-user/per-installation attribution, backoff, tarball (one request) ingestion | 403/429 rates |
| Small team over-scopes | High | High | Walking skeleton first; "not in release 1" list enforced | Milestone slips > 2 weeks |

Risks added by the free-first model:

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Free models too weak for grounded tutorials | Medium | High | Lite pipeline, allow-list gated by nightly evals, Draft labels, clear upgrade path to BYOK | Free-model claim support far below the frontier preset |
| OpenRouter changes free-model limits or catalogue | Medium | Medium | Pool size in config; per-user caps; guide users to their own keys; keep direct-provider BYOK | Rising 429s; models disappearing from the allow-list |
| A user key leaks | Low | High | Envelope encryption, key-encryption key outside the database, redaction tests, immediate delete | Any key-shaped string in logs or error reports |
| Ad revenue too small to matter | High | Low | Treat ads as optional; house ads until 50k pageviews/month | Pageviews well below the EthicalAds threshold |
| One server fails | Medium | Medium | Nightly R2 backups, restore drill, a Compose file that rebuilds a server in under an hour | Uptime alerts; failed backup alerts |

### 18.2 Unresolved questions

- Which developers use it most: OSS learners, people joining a new codebase at work, or students?
- What do learners actually use: narrative chapters, flow traces, quizzes, or "how to add feature X" walkthroughs?
- What generation time is acceptable before users leave the progress page (and does an email notification fix it)?
- How long should a tutorial be for a medium repo — and does a shorter "first hour" path beat full coverage?
- Is tutor chat expected at launch, or is the structured tutorial enough to start?
- Which second language (Python, Go, Java) has real demand among early users?
- Which models do BYOK users pick, and how often do free models fail validation?
- How much organic traffic do public tutorials actually bring?

### 18.3 Validation experiments

| # | Hypothesis | Method | Success threshold (to set before running) | Effort |
| --- | --- | --- | --- | --- |
| E1 | Grounded tutorials orient developers faster than wikis | 8–12 developers do timed tasks (find entry point, trace a flow, locate where to add a feature) on unfamiliar repos: with our tutorial vs DeepWiki/Code Wiki vs nothing | Our condition clearly faster and more accurate than the wiki condition (e.g. ≥ 30% less time at equal accuracy) | 2 weeks |
| E2 | Target users will finish tutorials | Concierge beta: generate (and hand-check) tutorials for 10–20 repos users actually need | Chapter-1 completion ≥ 60%; full completion ≥ 25% | 2–3 weeks |
| E3 | Embeddings are unnecessary for generation | Retrieval ablation on the golden set: lexical + graph vs + embeddings | Embeddings add < 5 points coverage → keep deferred | 3 days |
| E4 | Cheaper model routes hold quality | Ablations: Haiku vs Sonnet for lessons; Sonnet vs Opus for outline | Within 2 points on claim support and coverage → switch to the cheaper route | 3 days per ablation |
| E5 | Some developers will top up small credit packs | Offer $10/$20 packs late in beta; track top-up rate and ad revenue per 1,000 public pageviews | Measured rather than targeted — decides whether top-ups stay | 4 weeks |
| E6 | Developers will bring their own key | Measure the share of weekly active users who add a BYOK key vs stay on free credits | Set before launch, e.g. ≥ 30% of weekly actives | 6 weeks |
| E7 | Public tutorials drive acquisition | Publish 50 licence-checked tutorials of popular repos; track organic sessions and sign-ups | Sustained organic sign-ups after 8 weeks | 8 weeks |
| E8 | Users tolerate \~10-minute generation | Measure progress-page abandonment with and without email notification | Abandonment drops materially with notification | 2 weeks |

## 19. Source bibliography

All sources accessed 13–14 Oct 2026. "Official" means vendor documentation or pricing pages; "secondary" means third-party summaries, which should be re-checked against the vendor before committing money or architecture to a number.

| Source | Used for | Type | Published / updated |
| --- | --- | --- | --- |
| [Xia et al., Measuring Program Comprehension (IEEE TSE)](https://works.bepress.com/david_lo/286) | 58% of developer time on comprehension | Primary research | 2017–2018 |
| [Source Code Comprehension: definition and model (arXiv 2310.11301)](https://arxiv.org/pdf/2310.11301) | Comprehension literature, trust in code over docs | Primary research | 2023 |
| [Unblocked: developer onboarding tools](https://getunblocked.com/blog/best-developer-onboarding-tools/index.md) | AI trust (Stack Overflow), DX ramp-up, Sourcegraph Cody signups | Secondary (vendor blog) | 25 Sep 2026 |
| [Codersera: DeepWiki guide](https://codersera.com/blog/deepwiki-complete-guide-2026/) · [deepwiki-open guide](https://codersera.com/blog/deepwiki-complete-developer-guide-2026/) | DeepWiki scope, MCP, OSS clone | Secondary | 2026 |
| [AlternativeTo: Google Code Wiki](https://alternativeto.net/news/2025/11/google-launches-code-wiki-a-continuously-updated-and-gemini-powered-documentation-platform/) · [DevOps.com](https://devops.com/google-code-wiki-aims-to-solve-documentations-oldest-problem/) · [HackerNoon](https://sia.hackernoon.com/googles-new-tool-wants-to-end-the-most-annoying-part-of-coding) | Code Wiki features, private-repo plans, Mutable.ai origin | Secondary | Nov 2025 |
| [SourcePulse: PocketFlow Tutorial-Codebase-Knowledge](https://www.sourcepulse.org/projects/2391128) | Closest OSS tutorial generator | Secondary | 2025–2026 |
| [Swimm pricing](https://swimm.io/?p=4726) | Swimm positioning and LOC pricing | Official | 2026 |
| [nextjs.org blog](https://nextjs.org/blog?page=1) · [Makerkit: Next.js 16](https://makerkit.dev/blog/md/tutorials/nextjs-16) | Next.js 16.x status, security releases | Official / secondary | Aug 2026 / May 2026 |
| [shadcn/ui changelog: Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) · [changelog mirror](https://forceui.public.prd.shared.perforce.com/docs/changelog) · [CLI v4 summary](https://medium.com/@nakranirakesh/shadcn-ui-march-2026-update-cli-v4-ai-agent-skills-and-design-system-presets-d30cf200b0e9) | Base UI default, React Aria base, CLI v4 | Official / secondary | Jul 2026 / Mar 2026 |
| [Turborepo releases](https://releases.sh/vercel/turborepo-releases.md) · [Turborepo blog](https://turborepo.dev/blog) | Turborepo 2.11, Boundaries | Official mirror | Oct 2026 |
| [JFrog on pnpm 11](https://jfrog.com/help/r/artifactory-recently-published-npm-packages-may-be-blocked-for-24-hours-new-client-enforcements/artifactory-recently-published-npm-packages-may-be-blocked-for-24-hours-new-client-enforcements?contentId=cHkoIo8S6_8NEog6ipeQvw) · [lilting.ch](https://lilting.ch/en/articles/pnpm-11-minimum-release-age-default-shai-hulud-defense) · [Classmethod](https://dev.classmethod.jp/en/articles/pnpm-11-minimum-release-age-dependabot-ci-failure/) | pnpm 11 supply-chain defaults | Secondary | May–Jul 2026 |
| [Visual Studio Magazine: TypeScript 6.0](https://www.visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx) | TS 6.0 and 7.0 native preview | Secondary (news) | 23 Mar 2026 |
| [Encore: NestJS vs Fastify vs Hono](https://encore.dev/articles/nestjs-vs-fastify-vs-hono) · [Level Up: Node frameworks 2026](https://levelup.gitconnected.com/node-js-backend-frameworks-in-2026-the-honest-trade-offs-28112e1e5bc9) | Backend framework trade-offs | Secondary (vendor / blog) | 2026 |
| [InfoQ: oRPC 1.0](https://infoq.com/news/2025/12/orpc-v1-typesafe/) · [oRPC HTTP adapters](https://orpc.unnoq.com/docs/adapters/http) · [oRPC releases](https://newreleases.io/project/github/middleapi/orpc/release/v1.10.2) | Contract-first, OpenAPI, Fastify adapter, 2.0 beta | Secondary / official | Dec 2025 / 2026 |
| [Auth.js → Better Auth migration](https://authjs.dev/getting-started/migrate-to-better-auth) | Auth.js maintained by Better Auth | Official | 2026 |
| [Neon pricing](https://neon.com/pricing) · [Jet Admin Neon review](https://www.jetadmin.io/blog/neon-review/) | Postgres pricing, pooling, pgvector | Official / secondary | 2026 / 26 Sep 2026 |
| [Activepieces: Supabase pricing](https://www.activepieces.com/blog/supabase-pricing-free-tier-limits-pro-costs-egress.md) | Supabase Pro pricing | Secondary | 30 Sep 2026 |
| [pgvector docs mirror](https://docs.tantorlabs.ru/tdb/en/17_10/se/vector.html) · [Pigsty pgvector](https://pigsty.io/ext/e/vector/) | HNSW post-filtering, iterative scans | Official docs mirror / secondary | 2026 |
| [Makerkit: Drizzle vs Prisma](https://makerkit.dev/blog/md/tutorials/drizzle-vs-prisma) · [Kustiq: Drizzle](https://kustiq.com/company/drizzle.team) · [techsy](https://techsy.io/blog/prisma-vs-drizzle-orm) | ORM versions and trade-offs | Secondary | Sep 2026 |
| [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) · [Unified.to GitHub App vs OAuth](https://docs.unified.to/skills/github-oauth-app/SKILL.md) | App vs OAuth, limits, token format change | Official / secondary | 2026 |
| [GitHub changelog: code navigation](https://github.blog/changelog/label/code-navigation) · [Sourcegraph: SCIP](https://sourcegraph.com/blog/announcing-scip) | tree-sitter navigation; precise indexing | Official | Various |
| [SmartScope: RAG vs agentic search](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/) · [AI Engineer talk](https://www.ai.engineer/talks/UM6sFg_jdlE-rag-is-dead-right-kuba-rogut) | Claude Code moving from vector DB to agentic search; Cursor's index | Secondary | 2026 |
| [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Model prices, caching, Batch, tokenizer note | Official | Fetched 14 Oct 2026 |
| [mem0: OpenAI pricing](https://mem0.ai/library/llms-and-models/openai-api-pricing) · [laozhang: Gemini pricing](https://blog.laozhang.ai/en/posts/gemini-api-pricing.md) · [BenchLM: Google pricing](https://benchlm.ai/google/api-pricing) | Competitor model prices | Secondary | Oct 2026 |
| [AI SDK 6 summary](https://lobehub.com/skills/openclaw-skills-ai-sdk-core) | `generateText` + `Output.object` | Secondary | 2026 |
| [pg-boss on npm](https://npmjs.com/package/pg-boss) · [pg-boss releases](https://www.github.com/timgit/pg-boss/releases) · [Inngest: job queue alternatives](https://www.inngest.com/blog/best-job-queue-alternatives) | Queue features; queues vs durable execution | Official / vendor | 2026 |
| [Northflank: E2B vs Vercel Sandbox](https://northflank.com/blog/e2b-vs-vercel-sandbox) · [Vercel KB](https://vercel.com/kb/guide/vercel-sandbox-vs-e2b) · [DEV: sandboxing AI code](https://dev.to/alexcloudstar/sandboxing-ai-generated-code-e2b-vs-vercel-sandbox-vs-modal-vs-daytona-in-2026-3c7g) | Execution sandbox options | Vendor / secondary | Mar–Jun 2026 |
| [Coralogix: OWASP LLM Top 10](https://coralogix.com/?p=79971) · [Aembit: OWASP LLM Top 10](https://aembit.io/blog/owasp-top-10-llm-risks-explained/) | Prompt injection, unbounded consumption, system-prompt leakage | Secondary | 2025–2026 |
| [Vercel Pro plan docs](https://vercel.com/docs/plans/pro) | Vercel pricing | Official | 3 Feb 2026 |
| [Findstack: Railway vs Render vs Fly](https://findstack.com/resources/railway-vs-render-vs-fly-io) · [Encore: Render vs Railway](https://encore.dev/resources/render-vs-railway) · [Puter: Fly alternatives](https://developer.puter.com/blog/fly-io-alternatives/) | App hosting comparison | Secondary | 2026 |
| [Filebase: R2 pricing](https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/) | Object storage pricing | Secondary | 2026 |
| [Pelcro: Stripe fees](https://www.get.pelcro.com/tools/stripe-fee-calculator) · [iTechGuides: Stripe Billing](https://www.itechguides.com/how-to-estimate-stripe-fees-for-your-business/) | Payment fees | Secondary | Sep 2026 |

Sources added in the 14 Oct 2026 revision (individual-only, BYOK, low-cost hosting):

| Source | Used for | Type | Published / updated |
| --- | --- | --- | --- |
| [OpenRouter pricing](https://openrouter.ai/pricing) · [OpenRouter rate limits (help centre)](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know) | Free-model limits, BYOK allowance and fee | Official | 2026 / 23 Sep 2026 |
| [WhichDevTool: OpenRouter](https://whichdevtool.com/tools/openrouter/) · [utilengine: free models](https://utilengine.com/blog/openrouter-free-models/) | 5.5% credit fee; prompts may be logged on some free providers | Secondary | Sep–Oct 2026 |
| [EthicalAds calculator](https://www.ethicalads.io/publishers/calculator/) · [publisher guide](https://www.ethicalads.io/publisher-guide/) · [publisher FAQ](https://www.ethicalads.io/publishers/faq/) · [open-source publishers](https://www.ethicalads.io/publishers/topics/open-source/) · [July 2026 newsletter](https://www.ethicalads.io/blog/2026/07/ethicalads-newsletter-july-2026/) | CPM, revenue share, 50k-pageview threshold, placement rules, no-tracking ads, sponsor demand | Official | 2026 |
| [byteiota: Hetzner June 2026](https://byteiota.com/hetzner-june-2026-price-shock/) · [Findstack: Hetzner increase](https://findstack.com/resources/hetzner-price-increase-2026) · [Schmalbach: availability](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/) · [AgentDeals: Hetzner vs Oracle](https://agentdeals.dev/hetzner-pricing-2026) | VPS prices, availability, Oracle Always Free comparison | Secondary | Jun–Sep 2026 |
| [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/index.md) · [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/platform/functions/pricing/) | Free-plan requests; free static assets | Official | 2026 |
| [Makerkit: Vercel cost](https://makerkit.dev/blog/tutorials/vercel-cost) | Vercel Hobby is personal-use only | Secondary | May 2026 |

## 20. If I were building this product today

I would build a **free-first, TypeScript/JavaScript-only, grounded tutorial generator for individual developers**, where each developer chooses the model and who pays, running on one small server — and resist every feature that does not help prove that learners get oriented faster.

### The exact initial stack

- **Repo:** Node 24 LTS, pnpm 11, Turborepo 2.11, TypeScript 6.0; packages `contracts`, `ui`, `ai`, `repo-analysis`, `config`, plus `tools/evals`.
- **Frontends:** Next.js 16 + React 19.2 — landing as a static export on Cloudflare Pages, product as a standalone Node server; shadcn/ui on Base UI with Tailwind v4; TanStack Query; Shiki; Mermaid.
- **Backend:** Fastify 5, oRPC 1.x contract-first with Zod 4, Better Auth with GitHub sign-in; one `apps/api` with HTTP and worker entrypoints.
- **Data:** Postgres 17 in Docker on the server, Drizzle 0.45.x, pg-boss; Cloudflare R2 for blobs and nightly backups.
- **Code understanding:** GitHub App (Contents + Metadata, read-only), tarball ingestion, web-tree-sitter, own module resolution, framework adapters.
- **AI:** Vercel AI SDK 6 with the OpenRouter provider (free pool, credits, BYOK) plus direct Anthropic/OpenAI/Google providers for BYOK; Free/Budget/Balanced/Quality presets; envelope-encrypted key vault.
- **Ops:** one \~€6–7/month VPS with Caddy and Docker Compose, Cloudflare free, Sentry free, GitHub Actions.

### The first five engineering milestones

1. **Walking skeleton (week \~6):** public URL → live SSE progress → tarball → one free-model outline whose source links all resolve; crash, retry and cancel proven.
2. **Index you can trust:** symbols, import graph, routes and entry points correct on 10 golden repos, snapshot-tested.
3. **Eval harness + grounded generation** run on both the free-model allow-list and one frontier preset, so the quality gap is a number, not a guess.
4. **BYOK vault, model picker and free pool** with atomic per-user and global caps, and tests proving keys never reach logs or responses.
5. **Learning player and public pages**, deployed on the VPS with backups and alerts, then an open beta.

### What I would postpone

Credit top-ups (until users ask), EthicalAds (until \~50k monthly pageviews; house ads before that), tutor chat, embeddings, incremental regeneration, tutorial editing, any code execution, the dependency explorer, languages beyond TS/JS, and anything team-related.

### Assumptions to validate with real users

1. Developers get oriented measurably faster than with DeepWiki or Code Wiki.
2. Lite free-model tutorials on small public repos are good enough to hook new users.
3. A meaningful share of active users will add their own key once they hit the free limit.
4. Public tutorials attract enough readers for ads to fund some free runs.
5. One 4 GB server comfortably handles launch traffic and generation.

### The biggest technical risk to tackle first

**Grounded quality from free and budget models.** Free models have smaller contexts, weaker structured output and tight quotas; if their tutorials keep failing validation, the free tier collapses and the product looks bad on first contact. Run the eval suite on the free allow-list in weeks 3–7, alongside the indexer. If free-model claim support stays too low after two iteration cycles, narrow the free tier — smaller repos, fewer chapters, or a free outline with "finish with your own key" — rather than paying for frontier models out of pocket. Right behind it: build and test the key vault before the first user ever pastes a key.
