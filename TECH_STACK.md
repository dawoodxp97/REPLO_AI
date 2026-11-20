# TECH_STACK.md

Single source of truth for **what we use, which major we pin, and why**. Versions were checked against the npm registry on 18 Oct 2026; `pnpm-workspace.yaml` `catalog:` holds the shared ranges.

Optimisation order: **one language end to end → types that are also runtime validation → no paid infra until earned → no repo code ever executed → mainstream tools with long horizons.**

## Pinned majors

| Area            | Choice                                                                                                                         | Pin                      | Notes                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime         | Node.js                                                                                                                        | **24 LTS**               | `.nvmrc`, `engines`, CI and Docker use the same major                                                                                         |
| Package manager | pnpm                                                                                                                           | **11.x** (`11.28.6`)     | Latest is 12; we stay on 11 until a deliberate upgrade. Supply-chain defaults on                                                              |
| Monorepo        | Turborepo                                                                                                                      | **2.x**                  | `tasks` schema; content-hash cache, `--affected` in CI                                                                                        |
| Language        | TypeScript                                                                                                                     | **6.0.x**                | Last JS-based compiler; avoid deprecated flags so 7.0 (native) is drop-in. 7.x exists on npm — non-blocking CI job later                      |
| Frontends       | Next.js                                                                                                                        | **16.x** latest patch    | App Router. Patch promptly — 16.2.6 alone fixed 13 advisories                                                                                 |
| UI runtime      | React                                                                                                                          | **19.2+**                |                                                                                                                                               |
| Styling         | Tailwind CSS                                                                                                                   | **v4**                   | via `@tailwindcss/postcss`; tokens in `packages/ui`                                                                                           |
| Components      | shadcn/ui on **Base UI**                                                                                                       | CLI v4                   | We own the source; primitives in `packages/ui`                                                                                                |
| Server state    | TanStack Query                                                                                                                 | **5.x**                  | through oRPC TanStack utilities                                                                                                               |
| Forms           | react-hook-form + Zod resolver                                                                                                 | latest                   |                                                                                                                                               |
| Code highlight  | Shiki                                                                                                                          | latest                   | server-rendered, line anchors                                                                                                                 |
| Diagrams        | Mermaid                                                                                                                        | latest                   | lazy, `securityLevel: 'strict'`; validated server-side before publish                                                                         |
| Editor (later)  | CodeMirror 6                                                                                                                   | latest                   | read-only by default                                                                                                                          |
| Backend         | Fastify                                                                                                                        | **5.x**                  | plugins: helmet, cors, cookie, rate-limit                                                                                                     |
| API contract    | oRPC (+ `@orpc/contract`)                                                                                                      | **1.x**                  | **Stay off 2.0 beta**; OpenAPI built in; TanStack Query integration                                                                           |
| Validation      | Zod                                                                                                                            | **4.x**                  | one schema → API, jobs, LLM output, forms                                                                                                     |
| Auth            | Own code in `modules/identity`: scrypt passwords (`node:crypto`), opaque sessions, OAuth 2 with PKCE                           | n/a                      | Email and password, Google, GitHub; sessions and identities in our DB                                                                         |
| Database        | PostgreSQL                                                                                                                     | **17** (Neon serverless) | records + queue metadata + JSONB; pgvector installed, unused for now; hosted on Neon behind Hyperdrive                                        |
| ORM             | Drizzle ORM                                                                                                                    | **0.45.x**               | Typed query schema; hand-maintained numbered DDL files in `apps/api/db/ddl/`                                                                  |
| Job runtime     | Cloudflare Workflows (durable multi-step) + Cron Triggers                                                                      |                          | Stage = step, retries with backoff; `generation_jobs` stays the durable truth; replaces pg-boss                                               |
| Object storage  | Cloudflare R2 (S3 API); MinIO locally                                                                                          |                          | blobs by git blob SHA, tarballs (TTL), nightly backups                                                                                        |
| AI              | Vercel AI SDK                                                                                                                  | **6.x**                  | One user-chosen model per course (OpenRouter incl. `:free`, or direct OpenAI/Google/Anthropic); roles may share it; no spend ledger or budget |
| Charts          | Recharts (shadcn charts)                                                                                                       | latest                   | Dashboard analytics: line/bar, day/week/month timelines                                                                                       |
| Code parsing    | web-tree-sitter (WASM) + grammars                                                                                              | pin grammars together    | bump `analyzer_version` when they change (P3)                                                                                                 |
| Logging         | pino                                                                                                                           | latest                   | redaction on                                                                                                                                  |
| Errors          | Sentry (free tier)                                                                                                             |                          | product, api, worker                                                                                                                          |
| Tests           | Vitest · Testcontainers · Playwright · `tools/evals`                                                                           | Vitest 3.x               | Evals gate graph coverage, citation/diagram validity and course quality                                                                       |
| Lint/format     | ESLint 9 (flat) + typescript-eslint · Prettier                                                                                 |                          | boundary rules via `no-restricted-imports`                                                                                                    |
| API bundler     | tsdown                                                                                                                         | latest                   | one `dist/` with workspace deps inlined                                                                                                       |
| Dev runner      | tsx                                                                                                                            | latest                   | `tsx watch --env-file-if-exists=.env`                                                                                                         |
| Hosting         | Cloudflare: Workers (api), Workers + OpenNext (product), Static Assets (landing) · Neon Postgres + Hyperdrive · R2             |                          | one platform; retires the VPS/Compose/Caddy stack; Workers Paid $5/mo                                                                         |
| CI/CD           | GitHub Actions → OIDC → `wrangler versions upload/deploy` (staged rollout, instant rollback); DDL to Neon gated before rollout |                          | pin actions to SHAs; PR previews on `*.workers.dev`                                                                                           |

## Why not the alternatives (one line each)

- **TypeScript everywhere** — a two-person team can't afford two toolchains; Python/Go would duplicate every contract.
- **pnpm + Turborepo** — strict workspaces, `catalog:`, supply-chain defaults; Nx is heavier than 3 apps need.
- **Next.js (both apps)** — static export for landing, SSR only for the admin role gate and metadata; Vite SPA lacks that server gate, Astro adds a third framework.
- **shadcn on Base UI** — own the source so the learning player can be shaped exactly; Ant/MUI are heavy and hard to bend into a reading experience.
- **Fastify + oRPC** — mature plugins, Node-native for tar/tree-sitter; contract package shared by both sides (Hono RPC would infer types from server code); tRPC isn't contract-first.
- **Postgres (+ pg-boss)** — relational domain, JSONB documents, queue in the DB we already run; no Redis, no vector DB, no graph DB.
- **Drizzle** — SQL transparency, typed JSONB, no codegen; Prisma's codegen/abstractions get in the way for `SKIP LOCKED` and pgvector.
- **tree-sitter (WASM)** — fast, error-tolerant, nothing to install or execute; TS compiler API/SCIP need installed dependencies (= running installs).
- **AI SDK + OpenRouter + direct providers** — one structured-output interface; OpenRouter is the recommended key (one key, many models, `:free` models); direct provider keys are supported for users who prefer them.
- **Cloudflare Workers + Neon + R2** — one platform, scale-to-zero, no servers to patch; Workflows matches the checkpointed pipeline 1:1. Alternatives: a VPS stays cheaper at constant high CPU load and is the fallback if isolate memory (128 MB) blocks large-repo ingest even with pre-flight caps.

## Design sketches vs. reality

Early design sketches are written against assumed versions. Always check the installed package's types before copying. Known places to re-verify: oRPC Fastify adapter options, pg-boss v10 `work`/`send` signatures (handlers receive an **array** of jobs), AI SDK 6 provider package majors, pnpm 11 `allowBuilds` shape, Better Auth schema generation.

## Environment variables

Each process validates its variables with Zod at boot (`apps/api/src/platform/config`). Templates: `apps/*/.env.example`. Summary:

| Group         | Variables                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| API core      | `NODE_ENV`, `PORT`, `DATABASE_URL`, `API_PUBLIC_URL`, `AUTH_COOKIE_DOMAIN`, `PRODUCT_ORIGIN`                              |
| GitHub        | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64), `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG` |
| Keys          | `KEY_ENCRYPTION_KEY`, `KEY_ENCRYPTION_KEY_VERSION`. No platform-owned provider keys                                       |
| Limits        | `MAX_LITE_PIPELINE_FILES`, `MAX_JOB_TOKENS`, `MAX_JOB_SECONDS`, `WORKER_CONCURRENCY`, `MAX_REPO_FILES`, `MAX_REPO_BYTES`  |
| Observability | `LOG_LEVEL`                                                                                                               |
| Product       | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `API_INTERNAL_URL`                                |
| Landing       | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`                                                                             |
| Payments      | Removed — no billing, credits or payment provider in the product                                                          |

## Local ports

| Service             | Port        |
| ------------------- | ----------- |
| landing             | 7100        |
| product             | 7101        |
| api (HTTP)          | 7200        |
| api worker health   | 7201        |
| Postgres            | 5432        |
| MinIO API / console | 9000 / 9001 |
