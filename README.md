# Replo

Grounded, chaptered tutorials for any TypeScript/JavaScript repository. Paste a repo and get a sequenced learning path where every explanation links to the exact file and line at a pinned commit, checked by machine before you read it.

Free for everyone. Bring your own provider key (BYOK) only. Built for individual developers.

> **Status:** the backend (phases B0–B9) and the frontend (F0–F7) are implemented and pass their local tests. The landing site is built, but its policy pages are drafts until they are reviewed. Not yet verified: the GitHub App round trip, real provider keys, staging and production deployment. See [`ROADMAP.md`](./ROADMAP.md) and [`docs/adr/007-byok-only-no-billing.md`](./docs/adr/007-byok-only-no-billing.md).

## Contents

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Configure](#configure)
- [Start the database](#start-the-database)
- [Run in development](#run-in-development)
- [Build](#build)
- [Run a production build locally](#run-a-production-build-locally)
- [Test and check](#test-and-check)
- [Database commands](#database-commands)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Licence](#licence)

## Prerequisites

| Tool       | Version                                | Notes                                                                          |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| Node.js    | 24 (`.nvmrc`; `engines` is `>=24 <25`) | `nvm use` reads `.nvmrc`                                                       |
| pnpm       | 11.28.6                                | Pinned by the `packageManager` field. Enable it with Corepack                  |
| PostgreSQL | 17                                     | Either Docker (recommended, see below) or any local Postgres 17 with `pg_trgm` |
| Docker     | Optional                               | Only used by `pnpm infra:up` to start Postgres                                 |
| OpenSSL    | Any recent version                     | Generates the two secrets in step 4                                            |

You do not need a GitHub App or a provider key to run the app locally. Sign-in with GitHub needs a GitHub App (see [Run in development](#run-in-development)). Provider keys are added inside the app, not in an environment file.

## Install

```bash
git clone https://github.com/dawoodxp97/REPLO_AI.git
cd REPLO_AI
corepack enable          # once per machine; installs the pnpm version the repo pins
pnpm install
```

`pnpm install` uses the frozen lockfile. If it fails on a brand-new release, see [Troubleshooting](#troubleshooting).

## Configure

Each app reads its own environment file. The example files are committed. Copy them, then edit the copies. The real files are git-ignored.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/product/.env.example apps/product/.env.local
cp apps/landing/.env.example apps/landing/.env.local
```

Generate the two required secrets and put them in `apps/api/.env`:

```bash
openssl rand -base64 32    # BETTER_AUTH_SECRET (use at least 32 characters)
openssl rand -base64 32    # KEY_ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

Variables you will most likely change:

| File                      | Variable                                                         | Default                                          | Purpose                                                                  |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `apps/api/.env`           | `DATABASE_URL`                                                   | `postgres://app:app@localhost:5432/replo`        | Postgres connection                                                      |
| `apps/api/.env`           | `BETTER_AUTH_SECRET`                                             | none, you must set it                            | Session signing (at least 32 characters)                                 |
| `apps/api/.env`           | `KEY_ENCRYPTION_KEY`                                             | none, you must set it                            | AES-256-GCM key for stored provider keys (base64 of 32 bytes)            |
| `apps/api/.env`           | `BETTER_AUTH_URL`, `PRODUCT_ORIGIN`                              | `http://localhost:4000`, `http://localhost:3001` | Where the API and the app are served                                     |
| `apps/api/.env`           | `GITHUB_APP_*`, `GITHUB_WEBHOOK_SECRET`                          | empty                                            | Optional, for GitHub sign-in and private repositories                    |
| `apps/product/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `API_INTERNAL_URL` | local ports                                      | Used at build time (`NEXT_PUBLIC_*`) and at runtime (`API_INTERNAL_URL`) |
| `apps/landing/.env.local` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`                    | local ports                                      | Links to the app and the canonical site URL                              |

Never commit a real `.env` file. Only the `.env.example` files belong in git.

## Start the database

With Docker (starts Postgres 17 with pgvector on port 5432, user `app`, password `app`, database `replo`):

```bash
pnpm infra:up
```

Without Docker, create a database called `replo` on your local Postgres 17 and set `DATABASE_URL` in `apps/api/.env` to point at it.

Then apply the migrations:

```bash
pnpm db:migrate
```

The worker creates its own `pgboss` schema the first time it starts.

## Run in development

```bash
pnpm dev
```

This starts every app through Turborepo:

| Service               | URL                         | Health check                                                          |
| --------------------- | --------------------------- | --------------------------------------------------------------------- |
| Landing (static site) | http://localhost:3000       | —                                                                     |
| Product (the app)     | http://localhost:3001/login | —                                                                     |
| API                   | http://localhost:4000       | `curl http://127.0.0.1:4000/healthz` (liveness), `/readyz` (database) |
| Worker                | health on port 4001         | `curl http://127.0.0.1:4001/healthz`                                  |

To start one part only:

```bash
pnpm dev:landing
pnpm dev:product
pnpm dev:api          # API and worker together
```

Stop everything with `Ctrl+C`. To stop the database: `pnpm infra:down`.

**GitHub sign-in (optional).** The sign-in provider is only enabled when `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` are set. [`docs/DEVELOPING.md`](./docs/DEVELOPING.md#github-sign-in-needed-to-see-the-logged-in-ui) lists the GitHub App settings: the callback URL, the read-only permissions and the webhook secret.

## Build

Build everything in dependency order:

```bash
pnpm build
```

Or build one app:

```bash
pnpm --filter @replo/api build        # API and worker bundles (tsdown)
pnpm --filter @replo/product build    # Next.js standalone server
pnpm --filter @replo/landing build    # static export
```

Where the output goes (all git-ignored):

| App     | Output                                                            |
| ------- | ----------------------------------------------------------------- |
| API     | `apps/api/dist/main.http.mjs` and `apps/api/dist/main.worker.mjs` |
| Product | `apps/product/.next/standalone/` (the standalone server)          |
| Landing | `apps/landing/out/` (plain HTML, CSS and JavaScript)              |

Two things to know before a build:

- The product and landing read their `NEXT_PUBLIC_*` variables at build time. Set them in the `.env.local` files before you run `pnpm build`.
- The product build downloads Google Fonts with `next/font/google`, so the first build needs internet access.

## Run a production build locally

Build first (see above), then start each part. Each command runs in the shell, so export the variables the server needs. The API and worker read `apps/api/.env` through `--env-file`.

```bash
# API (from apps/api)
cd apps/api
node --env-file=.env dist/main.http.mjs      # listens on port 4000

# Worker (from apps/api, in a second terminal)
node --env-file=.env dist/main.worker.mjs    # health on port 4001

# Product (from the repository root)
pnpm --filter @replo/product start           # standalone server on port 3001
```

The product's server-rendered pages call the API at `API_INTERNAL_URL`. Export it in the shell when you run the server. To change the port, set `PORT`.

```bash
# Landing (from the repository root)
pnpm --filter @replo/landing start           # serves apps/landing/out on port 3000
```

The landing `start` script runs `npx serve@14.2.6`, which downloads that version the first time.

## Test and check

| Command                            | What it runs                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm verify`                      | Lint, typecheck, unit tests and build for every package, the core of what CI runs             |
| `pnpm lint`                        | ESLint across the monorepo, including the import-boundary and no-comments rules               |
| `pnpm typecheck`                   | TypeScript across the monorepo                                                                |
| `pnpm test`                        | Unit tests. Database tests are skipped unless `TEST_DATABASE_URL` is set                      |
| `pnpm --filter @replo/evals smoke` | Evaluation smoke check: index baseline and recorded model answers through the allow-list gate |
| `pnpm format:check`                | Prettier check                                                                                |

**Database tests.** They truncate tables, so point them at a disposable database. Create one, then run:

```bash
docker compose exec postgres createdb -U app replo_test    # if you use Docker
TEST_DATABASE_URL=postgres://app:app@localhost:5432/replo_test pnpm test
```

**Browser tests (Playwright).** They build the product and start it with a mock API on ports 3101 and 4100. Stop anything that uses those ports first. Install the browser once:

```bash
pnpm --filter @replo/product exec playwright install chromium
pnpm --filter @replo/product test:e2e
```

## Database commands

```bash
pnpm db:generate       # create a migration from changes to apps/api/src/platform/db/schema.ts (review the SQL)
pnpm db:migrate        # apply migrations to the database in apps/api/.env
pnpm db:check-drift    # check that the migration snapshots match the schema
```

Read [`docs/DATABASE.md`](./docs/DATABASE.md) before you change the schema. Breaking changes need an expand, backfill and contract sequence across two releases.

## Project layout

```
apps/
  landing/        Next.js 16 static export (Cloudflare Pages)         :3000
  product/        Next.js 16 app, learning player and public pages     :3001
  api/            Fastify 5 + oRPC + Better Auth; HTTP API and worker  :4000 (worker health :4001)
packages/
  contracts/      Zod 4 + oRPC contract, the only code the frontends and API share
  ai/             Model roles, catalogue, budgets and BYOK model resolution
  repo-analysis/  Source filters, path safety, tree-sitter index
  ui/             Base UI primitives and Tailwind v4 tokens
  config/         Shared TypeScript and ESLint configuration
tools/evals/      Golden-repository evaluation harness
docs/             Developer guide, API, database, decisions (ADRs)
OLD_LEGACY_REPLO/ The legacy app, read only as a feature reference (MEM D-016)
```

## Troubleshooting

- **`pnpm install` fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`.** The workspace refuses package versions younger than three days. This gate is intentional. Lower the version floor in the affected range instead of turning the gate off. [`MEM.md`](./MEM.md) decision D-010 explains the procedure.
- **`pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`.** A package with an install script is not listed in `allowBuilds`. See D-011 in [`MEM.md`](./MEM.md).
- **The API exits at startup with a configuration error.** Check `apps/api/.env`. `BETTER_AUTH_SECRET` needs at least 32 characters, and `KEY_ENCRYPTION_KEY` must decode to exactly 32 bytes.
- **`/readyz` returns 503.** The API cannot reach the database. Check `DATABASE_URL`, and that `pnpm infra:up` or your local Postgres is running.
- **`localhost` does not reach the server, but `127.0.0.1` does.** Some macOS setups resolve `localhost` to IPv6 (`::1`), where another process may already listen. Use `127.0.0.1` or stop the other process.
- **Port 3000, 3001, 4000 or 4001 is already in use.** Find the process with `lsof -iTCP:3001 -sTCP:LISTEN -n -P` and stop it, or change the port in the matching environment file.
- **TypeScript reports errors about routes after you rename a folder.** Delete `apps/product/.next` and run the command again.
- **Playwright reports a missing browser.** Run `pnpm --filter @replo/product exec playwright install chromium`.

## Documentation

| Doc                                                                                                   | What it is                                                                |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`PRD.md`](./PRD.md)                                                                                  | Product requirements, with FR- and NFR- IDs                               |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)                                                                | How the parts fit together: topology, modules, pipeline, jobs, deployment |
| [`TECH_STACK.md`](./TECH_STACK.md)                                                                    | Pinned versions, rationale, environment variables and ports               |
| [`RULES.md`](./RULES.md)                                                                              | Engineering rules for humans and AI agents                                |
| [`DESIGN.md`](./DESIGN.md)                                                                            | Design system: tokens, type, layout, accessibility checklist              |
| [`SECURITY.md`](./SECURITY.md)                                                                        | Threat model, controls and the secure-development checklist               |
| [`ROADMAP.md`](./ROADMAP.md)                                                                          | Phases with status and acceptance criteria                                |
| [`MEM.md`](./MEM.md)                                                                                  | Decision log, deviations from the blueprint, gotchas and open items       |
| [`docs/DEVELOPING.md`](./docs/DEVELOPING.md)                                                          | How to run it, add endpoints, wire the frontend and add background jobs   |
| [`docs/DATABASE.md`](./docs/DATABASE.md) · [`docs/API.md`](./docs/API.md) · [`docs/adr/`](./docs/adr) | Data model, API surface and architecture decision records                 |
| [`Replo_BluePrint.md`](./Replo_BluePrint.md)                                                          | The original research and technical blueprint, the source for why         |
| [`CLAUDE.md`](./CLAUDE.md)                                                                            | Orientation for AI coding agents                                          |

## Ground rules

Never execute repository code. Never log secrets or private source. Provider keys are decrypted only in the worker, in memory, for one job. The platform holds no provider keys. Foreign IDs return 404. The model points and the system quotes. Frontends import only the contract types and the UI package. No pricing, billing, credits or ads. Details are in [`RULES.md`](./RULES.md).

## Licence

Released under the MIT licence. See [`LICENSE`](./LICENSE).
