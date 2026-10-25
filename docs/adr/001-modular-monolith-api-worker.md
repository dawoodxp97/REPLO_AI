# ADR-001 — Modular monolith with separate API and worker processes

- **Status:** Accepted (blueprint §17.2)
- **Context:** Generation jobs run for minutes and consume CPU/memory unpredictably; the team is small (1–3 devs).
- **Decision:** One `apps/api` package with two entrypoints (`main.http.ts`, `main.worker.ts`), deployed as separate services from one image. Module boundaries (`modules/*`) are enforced by lint and the "services only" rule (RULES.md §4).
- **Consequences:** Independent scaling and crash isolation without distributed-systems overhead; shared code and types; one deploy pipeline.
- **Revisit when:** Indexing needs different hardware or a non-TS runtime; a module needs a separate security boundary (code execution, single-tenant); teams block each other's deploys.
