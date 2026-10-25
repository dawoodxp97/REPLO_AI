# ADR-002 — Postgres-backed queue (pg-boss) for release 1

- **Status:** Accepted (blueprint §17.3, §9)
- **Context:** Low job volume (hundreds–thousands/day), high cost per job, correctness over throughput. Dual writes between a DB and Redis are a classic source of lost or phantom jobs.
- **Decision:** pg-boss in the same Postgres. Enqueue **inside the transaction** that creates the `generation_jobs` row. `generation_jobs` is the durable truth; stage checkpoints in `job_stages`; progress via `job_events` + SSE. The queue only delivers work (at-least-once); every stage is idempotent.
- **Consequences:** One stateful system to back up and monitor; seconds of dispatch latency; the database stays awake (acceptable on our own VPS; rules out Neon free tier).
- **Revisit when:** Sustained queue latency above SLO; polling load visible in DB CPU; need for distributed rate limiting across many workers; multi-step workflows with long waits.
