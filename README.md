# Replo

**Graph-first understanding for any GitHub repository.** Paste a repo and get a knowledge graph, interactive diagrams and a sequenced course where every explanation links to the exact file and line at a pinned commit.

Free for everyone. Bring your own provider key (BYOK) only. Built for individual developers — no teams, no billing, no ads.

[![CI](https://github.com/dawoodxp97/REPLO_AI/actions/workflows/ci.yml/badge.svg)](https://github.com/dawoodxp97/REPLO_AI/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-24-339933?logo=node.js&logoColor=white)](./.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-11.28.6-f69220?logo=pnpm&logoColor=white)](./package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)

> **Status:** Release 1 is in build. Not yet verified end to end: the GitHub App round trip, real provider keys, staging and production deployment.

---

## Contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Configure](#configure)
- [Start the database](#start-the-database)
- [Run in development](#run-in-development)
- [Build](#build)
- [Run a production build locally](#run-a-production-build-locally)
- [Deploy](#deploy)
- [Test and check](#test-and-check)
- [Database commands](#database-commands)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [Ground rules](#ground-rules)
- [Troubleshooting](#troubleshooting)
- [Licence](#licence)

## Quick start

For a local checkout with Docker:

```bash
git clone https://github.com/dawoodxp97/REPLO_AI.git
cd REPLO_AI
corepack enable                 # installs the pinned pnpm
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/product/.env.example apps/product/.env.local
cp apps/landing/.env.example apps/landing/.env.local
# set KEY_ENCRYPTION_KEY in apps/api/.env: openssl rand -base64 32
pnpm infra:up                   # Postgres 17 + pgvector
pnpm db:setup                   # create the schema
pnpm dev                        # landing :7100 · product :7101 · api :7200 (+worker :7201)
```

Open <http://localhost:7101/login>. Each step is explained below.

## Prerequisites

| Tool       | Version                                | Notes                                                                              |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Node.js    | 24 (`.nvmrc`; `engines` is `>=24 <25`) | `nvm use` reads `.nvmrc`                                                           |
| pnpm       | 11.28.6                                | Pinned by the `packageManager` field. Enable it with Corepack                      |
| PostgreSQL | 17                                     | Docker (recommended, see below) or any local Postgres 17 with `pg_trgm`/`pgvector` |
| Docker     | Optional                               | Only used by `pnpm infra:up` to start Postgres                                     |
| OpenSSL    | Any recent version                     | Generates the encryption key in step 4                                             |

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

Generate the one required secret and put it in `apps/api/.env`:

```bash
openssl rand -base64 32    # KEY_ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

Variables you will most likely change:

| File                      | Variable                                                         | Default                                          | Purpose                                                                     |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/api/.env`           | `DATABASE_URL`                                                   | `postgres://app:app@localhost:5432/replo`        | Postgres connection                                                         |
| `apps/api/.env`           | `KEY_ENCRYPTION_KEY`                                             | none, you must set it                            | AES-256-GCM key for stored provider keys (base64 of 32 bytes)               |
| `apps/api/.env`           | `API_PUBLIC_URL`, `PRODUCT_ORIGIN`                               | `http://localhost:7200`, `http://localhost:7101` | Where the API and the app are served (OAuth callbacks use `API_PUBLIC_URL`) |
| `apps/api/.env`           | `GOOGLE_CLIENT_*`, `GITHUB_APP_CLIENT_*`                         | empty                                            | Optional, for Google and GitHub sign-in (email and password needs nothing)  |
| `apps/api/.env`           | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`                        | empty                                            | Optional, for GitHub App installs (private repositories)                    |
| `apps/product/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `API_INTERNAL_URL` | local ports                                      | Used at build time (`NEXT_PUBLIC_*`) and at runtime (`API_INTERNAL_URL`)    |
| `apps/landing/.env.local` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`                    | local ports                                      | Links to the app and the canonical site URL                                 |

Never commit a real `.env` file. Only the `.env.example` files belong in git.

## Start the database

With Docker (starts Postgres 17 with pgvector on port 5432, user `app`, password `app`, database `replo`):

```bash
pnpm infra:up
```

This starts PostgreSQL only. The legacy MinIO service is opt-in through the `storage` Compose profile and is not used by the current release; Redis remains in the `later` profile. If another database already owns port 5432, set `POSTGRES_PORT=5433` in a git-ignored root `.env` and use port 5433 in `apps/api/.env` as well.

Without Docker, create a database called `replo` on your local Postgres 17 and set `DATABASE_URL` in `apps/api/.env` to point at it.

Then create the application tables:

```bash
pnpm db:setup
```

The worker creates its own `pgboss` schema the first time it starts.

## Run in development

```bash
pnpm dev
```

This starts every app through Turborepo:

| Service               | URL                         | Health check                                                          |
| --------------------- | --------------------------- | --------------------------------------------------------------------- |
| Landing (static site) | http://localhost:7100       | —                                                                     |
| Product (the app)     | http://localhost:7101/login | —                                                                     |
| API                   | http://localhost:7200       | `curl http://127.0.0.1:7200/healthz` (liveness), `/readyz` (database) |
| Worker                | health on port 7201         | `curl http://127.0.0.1:7201/healthz`                                  |

To start one part only:

```bash
pnpm dev:landing
pnpm dev:product
pnpm dev:api          # API and worker together
```

Stop everything with `Ctrl+C`. To stop the database: `pnpm infra:down`.

**GitHub sign-in (optional).** The sign-in provider is only enabled when `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` are set. The GitHub App needs a callback URL and read-only Contents + Metadata permissions.

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
node --env-file=.env dist/main.http.mjs      # listens on port 7200

# Worker (from apps/api, in a second terminal)
node --env-file=.env dist/main.worker.mjs    # health on port 7201

# Product (from the repository root)
pnpm --filter @replo/product start           # standalone server on port 7101
```

The product's server-rendered pages call the API at `API_INTERNAL_URL`. Export it in the shell when you run the server. To change the port, set `PORT`.

```bash
# Landing (from the repository root)
pnpm --filter @replo/landing start           # serves apps/landing/out on port 7100
```

The landing `start` script runs `npx serve@14.2.6`, which downloads that version the first time.

## Deploy

Production runs entirely on Cloudflare Workers: the API and generation pipeline as Workers/Workflows, Postgres on Neon (via Hyperdrive), blobs on R2, and one public origin served by the `apps/gateway` Worker.

The gateway serves everything on a single `workers.dev` hostname (default `app.reploai.workers.dev`):

| Path            | Serves                           |
| --------------- | -------------------------------- |
| `/`             | Landing (static export)          |
| `/app`          | Product (OpenNext on Cloudflare) |
| `/rpc`, `/auth` | API (Fastify on Workers)         |

Deploy everything with:

```bash
pnpm cf:deploy            # landing → product → pipeline → api → gateway
```

Or deploy a single part:

```bash
pnpm cf:landing:deploy
pnpm cf:product:deploy
pnpm cf:pipeline:deploy
pnpm cf:api:deploy
pnpm cf:gateway:deploy
```

**One-time setup.** Create a Cloudflare API token (template "Edit Cloudflare Workers", plus D1/Hyperdrive/R2 edit scopes) and set these repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `NEON_DATABASE_URL` (Neon Postgres 17 connection string). `.github/workflows/deploy.yml` runs the verify job and deploys on every push to `main`; `.github/workflows/preview.yml` builds preview versions for pull requests.

The `NEXT_PUBLIC_*` values are inlined at build time, so the deploy scripts bake the production URLs. `node scripts/check-production-bundle.mjs` fails the deploy if a bundle picked up localhost. See [`CLAUDE.md`](./CLAUDE.md) for the full list of build-time gotchas.

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

**Browser tests (Playwright).** They build the product and start it with a mock API on ports 7110 and 7210. Stop anything that uses those ports first. Install the browser once:

```bash
pnpm --filter @replo/product exec playwright install chromium
pnpm --filter @replo/product test:e2e
```

## Database commands

```bash
pnpm db:setup          # RESET the Compose app/replo public schema, then apply apps/api/db/ddl/*.sql
```

`pnpm db:setup` deletes all objects in the `public` schema of the Compose `app/replo` database every time it runs. Start the Postgres service first and use only with a disposable development database. For schema changes, update the Drizzle table definitions and add a numbered DDL file; run that new file manually on existing databases.

## Project layout

```
apps/
  landing/        Next.js 16 static export (Cloudflare Worker)          :7100
  product/        Next.js 16 app, learning player and public pages       :7101
  api/            Fastify 5 + oRPC; own auth; HTTP API + generation worker :7200 (worker health :7201)
  gateway/        Cloudflare Worker: single origin (landing /, product /app, api /rpc + /auth)
packages/
  contracts/      Zod 4 + oRPC contract — the only code the frontends and API share
  ai/             Model roles, catalogue and BYOK model resolution
  repo-analysis/  Source filters, path safety, tree-sitter index
  ui/             Base UI primitives and Tailwind v4 tokens
  config/         Shared TypeScript and ESLint configuration
tools/evals/      Golden-repository evaluation harness
```

## Documentation

| Doc                                    | What it is                                                                |
| -------------------------------------- | ------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How the parts fit together: topology, modules, pipeline, jobs, deployment |
| [`TECH_STACK.md`](./TECH_STACK.md)     | Pinned versions, rationale, environment variables and ports               |
| [`RULES.md`](./RULES.md)               | Engineering rules, including security, for humans and AI agents           |
| [`DESIGN.md`](./DESIGN.md)             | Design system: tokens, type, layout, accessibility checklist              |
| [`CLAUDE.md`](./CLAUDE.md)             | Orientation for AI coding agents                                          |

## Ground rules

Never execute repository code. Never log secrets or private source. Provider keys are decrypted only in the worker, in memory, for one job. The platform holds no provider keys. Foreign IDs return 404. The model points and the system quotes. Frontends import only the contract types and the UI package. No pricing, billing, credits or ads. Details are in [`RULES.md`](./RULES.md).

## Troubleshooting

- **`pnpm install` fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`.** The workspace refuses package versions younger than three days. This gate is intentional. Lower the version floor in the affected range instead of turning the gate off.
- **`pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`.** A package with an install script is not listed in `allowBuilds`. Add it there.
- **The API exits at startup with a configuration error.** Check `apps/api/.env`. `KEY_ENCRYPTION_KEY` must decode to exactly 32 bytes.
- **`/readyz` returns 503.** The API cannot reach the database. Check `DATABASE_URL`, and that `pnpm infra:up` or your local Postgres is running.
- **`localhost` does not reach the server, but `127.0.0.1` does.** Some macOS setups resolve `localhost` to IPv6 (`::1`), where another process may already listen. Use `127.0.0.1` or stop the other process.
- **Port 7100, 7101, 7200 or 7201 is already in use.** Find the process with `lsof -iTCP:7101 -sTCP:LISTEN -n -P` and stop it, or change the port in the matching environment file.
- **TypeScript reports errors about routes after you rename a folder.** Delete `apps/product/.next` and run the command again.
- **Playwright reports a missing browser.** Run `pnpm --filter @replo/product exec playwright install chromium`.

## Licence

Released under the MIT licence. See [`LICENSE`](./LICENSE).
