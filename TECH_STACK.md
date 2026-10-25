# TECH_STACK.md

Single source of truth for **what we use, which major we pin, and why**. Full comparison tables and sources are in [`Replo_BluePrint.md` §4 and §17](./Replo_BluePrint.md). Versions were checked against the npm registry on 18 Oct 2026; `pnpm-workspace.yaml` `catalog:` holds the shared ranges.

Optimisation order: **one language end to end → types that are also runtime validation → no paid infra until earned → no repo code ever executed → mainstream tools with long horizons.**

## Pinned majors

| Area            | Choice                                                                                                      | Pin                               | Notes                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Runtime         | Node.js                                                                                                     | **24 LTS**                        | `.nvmrc`, `engines`, CI and Docker use the same major                                                                    |
| Package manager | pnpm                                                                                                        | **11.x** (`11.28.6`)              | Latest is 12; we stay on 11 per blueprint until a deliberate upgrade (see MEM D-002). Supply-chain defaults on           |
| Monorepo        | Turborepo                                                                                                   | **2.x**                           | `tasks` schema; content-hash cache, `--affected` in CI                                                                   |
| Language        | TypeScript                                                                                                  | **6.0.x**                         | Last JS-based compiler; avoid deprecated flags so 7.0 (native) is drop-in. 7.x exists on npm — non-blocking CI job later |
| Frontends       | Next.js                                                                                                     | **16.x** latest patch             | App Router. Patch promptly — 16.2.6 alone fixed 13 advisories                                                            |
| UI runtime      | React                                                                                                       | **19.2+**                         |                                                                                                                          |
| Styling         | Tailwind CSS                                                                                                | **v4**                            | via `@tailwindcss/postcss`; tokens in `packages/ui`                                                                      |
| Components      | shadcn/ui on **Base UI**                                                                                    | CLI v4                            | We own the source; primitives in `packages/ui`                                                                           |
| Server state    | TanStack Query                                                                                              | **5.x**                           | through oRPC TanStack utilities                                                                                          |
| Forms           | react-hook-form + Zod resolver                                                                              | latest                            |                                                                                                                          |
| Code highlight  | Shiki                                                                                                       | latest                            | server-rendered, line anchors                                                                                            |
| Diagrams        | Mermaid                                                                                                     | latest                            | lazy, `securityLevel: 'strict'`; validated server-side before publish                                                    |
| Editor (later)  | CodeMirror 6                                                                                                | latest                            | read-only by default                                                                                                     |
| Backend         | Fastify                                                                                                     | **5.x**                           | plugins: helmet, cors, cookie, rate-limit                                                                                |
| API contract    | oRPC (+ `@orpc/contract`)                                                                                   | **1.x**                           | **Stay off 2.0 beta**; OpenAPI built in; TanStack Query integration                                                      |
| Validation      | Zod                                                                                                         | **4.x**                           | one schema → API, jobs, LLM output, forms                                                                                |
| Auth            | Better Auth                                                                                                 | **1.x**                           | GitHub sign-in, Drizzle adapter, sessions in our DB                                                                      |
| Database        | PostgreSQL                                                                                                  | **17** (`pgvector/pgvector:pg17`) | records + queue + JSONB; pgvector installed, unused in R1                                                                |
| ORM             | Drizzle ORM + drizzle-kit                                                                                   | **0.45.x**                        | SQL migrations committed; move to 1.0 when stable                                                                        |
| Queue           | pg-boss                                                                                                     | **10.x**                          | transactional enqueue; confirm option names against pinned major                                                         |
| Object storage  | Cloudflare R2 (S3 API); MinIO locally                                                                       |                                   | blobs by git blob SHA, tarballs (TTL), nightly backups                                                                   |
| AI              | Vercel AI SDK                                                                                               | **6.x**                           | `generateText` + `Output.object`; OpenRouter provider + direct Anthropic/OpenAI/Google                                   |
| Code parsing    | web-tree-sitter (WASM) + grammars                                                                           | pin grammars together             | bump `analyzer_version` when they change (P3)                                                                            |
| Logging         | pino                                                                                                        | latest                            | redaction on                                                                                                             |
| Errors          | Sentry (free tier)                                                                                          |                                   | product, api, worker                                                                                                     |
| Tests           | Vitest · Testcontainers · Playwright                                                                        | Vitest 3.x                        |                                                                                                                          |
| Lint/format     | ESLint 9 (flat) + typescript-eslint · Prettier                                                              |                                   | boundary rules via `no-restricted-imports`                                                                               |
| API bundler     | tsdown                                                                                                      | latest                            | one `dist/` with workspace deps inlined                                                                                  |
| Dev runner      | tsx                                                                                                         | latest                            | `tsx watch --env-file-if-exists=.env`                                                                                    |
| Hosting         | One ~€6–7/mo VPS (Docker Compose + Caddy) · Cloudflare free (DNS/TLS/CDN, Pages for landing) · R2 free tier |                                   |                                                                                                                          |
| CI/CD           | GitHub Actions → GHCR → SSH `docker compose pull && run --rm migrate && up -d`                              |                                   | pin actions to SHAs                                                                                                      |

## Why not the alternatives (one line each)

- **TypeScript everywhere** — a two-person team can't afford two toolchains; Python/Go would duplicate every contract.
- **pnpm + Turborepo** — strict workspaces, `catalog:`, supply-chain defaults; Nx is heavier than 3 apps need.
- **Next.js (both apps)** — static export for landing, SSR for public tutorial pages; Vite SPA lacks SSR, Astro adds a third framework.
- **shadcn on Base UI** — own the source so the learning player can be shaped exactly; Ant/MUI are heavy and hard to bend into a reading experience.
- **Fastify + oRPC** — mature plugins, Node-native for tar/tree-sitter; contract package shared by both sides (Hono RPC would infer types from server code); tRPC isn't contract-first.
- **Postgres (+ pg-boss)** — relational domain, JSONB documents, queue in the DB we already run; no Redis, no vector DB, no graph DB in R1.
- **Drizzle** — SQL transparency, typed JSONB, no codegen; Prisma's codegen/abstractions get in the way for `SKIP LOCKED` and pgvector.
- **tree-sitter (WASM)** — fast, error-tolerant, nothing to install or execute; TS compiler API/SCIP need installed dependencies (= running installs).
- **AI SDK + OpenRouter + direct providers** — one structured-output interface; OpenRouter is the recommended key (one key, many models, `:free` models); direct provider keys are supported for users who prefer them (ADR-007).
- **One VPS + Cloudflare + R2** — ~€6–7/month fixed, long-running workers and SSE work, no per-service billing.

## Blueprint code vs. reality

The blueprint's code is a sketch written against assumed versions. Always check the installed package's types before copying. Known places to re-verify: oRPC Fastify adapter options, pg-boss v10 `work`/`send` signatures (handlers receive an **array** of jobs), AI SDK 6 provider package majors, pnpm 11 `allowBuilds` shape, Better Auth schema generation.

## Environment variables

Each process validates its variables with Zod at boot (`apps/api/src/platform/config`). Templates: `apps/*/.env.example`. Full list in blueprint §15.4; summary:

| Group            | Variables                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API core         | `NODE_ENV`, `PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_COOKIE_DOMAIN`, `PRODUCT_ORIGIN`                                                                                                      |
| GitHub           | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (base64), `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_SLUG`                                                                       |
| Keys | `KEY_ENCRYPTION_KEY`, `KEY_ENCRYPTION_KEY_VERSION`. No platform-owned provider keys (ADR-007) |
| Limits | `MAX_LITE_PIPELINE_FILES`, `DEFAULT_BYOK_JOB_BUDGET_USD`, `WORKER_CONCURRENCY`, `MAX_REPO_FILES`, `MAX_REPO_BYTES` |
| Observability | `LOG_LEVEL` |
| Product | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `API_INTERNAL_URL` |
| Landing          | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`                                                                                                                                                                            |
| Payments (later) | `PAYMENTS_PROVIDER`, `PAYMENTS_API_KEY`, `PAYMENTS_WEBHOOK_SECRET`                                                                                                                                                       |

## Local ports

| Service             | Port        |
| ------------------- | ----------- |
| landing             | 3000        |
| product             | 3001        |
| api (HTTP)          | 4000        |
| api worker health   | 4001        |
| Postgres            | 5432        |
| MinIO API / console | 9000 / 9001 |
