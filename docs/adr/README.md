# Architecture Decision Records

Decisions that are expensive to reverse. Format: **Context → Decision → Consequences → Revisit when.** The full 16-row decision matrix (alternatives, deciding criteria, cost of the choice) is in [`Replo_BluePrint.md` §17.1](../../Replo_BluePrint.md). Cheaper decisions and deviations live in [`MEM.md`](../../MEM.md).

| ADR                                                  | Title                                                       | Status   |
| ---------------------------------------------------- | ----------------------------------------------------------- | -------- |
| [001](./001-modular-monolith-api-worker.md)          | Modular monolith with separate API and worker processes     | Accepted |
| [002](./002-postgres-backed-queue.md)                | Postgres-backed queue (pg-boss) for release 1               | Accepted |
| [003](./003-no-embeddings-in-r1.md)                  | No embeddings in release 1                                  | Accepted |
| [004](./004-model-points-system-quotes.md)           | "The model points, the system quotes"                       | Accepted |
| [005](./005-read-only-github-no-code-execution.md)   | Read-only GitHub access and no execution of repository code | Accepted |
| [006](./006-individual-developers-byok-free-pool.md) | Individual developers only, with BYOK and a free pool       | Partly superseded by 007 |
| [007](./007-byok-only-no-billing.md)                 | BYOK only, free for everyone, no billing or ads ever        | Accepted |
| [008](./008-no-runnable-code-in-r1.md)               | No runnable code examples in the player in release 1        | Accepted |

New ADR: copy the shape of an existing one, number sequentially, add a row here, and link it from the PR.
