# Golden repositories

Ten repositories with ground truth, one `<name>.truth.json` each, validated by `TruthSheet` (`tools/evals/src/truth-sheet.ts`).

The source of each repo is a fixture under `packages/repo-analysis/fixtures/<name>`, so the set runs offline and in CI. The `commitSha` is all zeros because a fixture has no commit. These are **synthetic** repos, written to cover the shapes in blueprint §8.4. They are not real projects. Real public repos, pinned to a commit, come next with human-reviewed sheets (see below).

| Shape (`shape`)  | Repo               | What it stresses                                            |
| ---------------- | ------------------ | ----------------------------------------------------------- |
| `rest-api`       | `express-api`      | Router mounting, `listen`, scripts mapped back to `src`     |
| `rest-api`       | `fastify-api`      | Bin target, plugin registration, `Fastify()` receiver       |
| `nextjs-saas`    | `next-app-router`  | Route groups, dynamic segments, route handlers, aliases     |
| `nextjs-pages`   | `next-pages`       | `_app`, API routes, `baseUrl` imports                       |
| `spa-router`     | `react-router-spa` | Router factory and path properties                          |
| `redux-spa`      | `redux-spa`        | `index.html` entry, store, slice, component dispatch        |
| `monorepo`       | `monorepo`         | Workspace packages by name and subpath, per-package entries |
| `cli-or-library` | `cli`              | Bin entry, package main, test edge                          |
| `cli-or-library` | `library`          | Barrel re-exports, `.js` specifiers, dynamic import, error  |
| `legacy-js`      | `legacy-js`        | CommonJS chains, external package, no framework             |

Each truth sheet has: real **entry points**, **3–5 key flows**, **core modules**, **10 facts** (each pointing at the file that shows it), and the **index expectations** the analyzer must meet (entry points, routes, import edges, symbols, unresolved imports, parse errors).

## What is scored

- **Index metrics (now):** entry, route and import recall and precision; symbol recall; exact match of unresolved-import count and parse errors. Compared against `tools/evals/baseline/index.json`. A drop below the baseline fails CI.
- **Model probes (now):** schema validity, reference validity before validation, fabricated paths, entry recall, route recall, latency and cost. The gate in `src/gate.ts` decides allow-list entry and exit (RULES §6).
- **Pipeline metrics (not measured until B6–B7):** claim support, coverage, sequencing, quiz quality, reference validity after validation. The report lists them under `notMeasured`.

## Caveats

- The index expectations of the synthetic repos were checked against the source by hand and then matched by the analyzer. The baseline therefore guards against regressions. It is not an independent measure of accuracy. The facts and the model probes are the independent parts.
- Add real repos before any claim about index accuracy on real code: pin the commit, have a person write the sheet, and never commit private code.
