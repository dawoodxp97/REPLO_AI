# ADR-006 — Individual developers only, with BYOK and a free pool

- **Status:** Superseded in part by [ADR-007](./007-byok-only-no-billing.md) (22 Oct 2026). Still accepted: individual developers only, no team plans. Superseded: the platform free pool, prepaid credits and ad-funded runs.
- **Context:** The audience is individual developers, most of whom won't pay; the founder wants near-zero running cost and no revenue pressure at launch.
- **Decision:** No workspaces, roles or team plans. Every tutorial runs under a user-chosen **run source** (free pool on OpenRouter `:free` models, BYOK, or prepaid credits). Ads only on public pages and only to fund AI cost. Everything on one small server.
- **Consequences:** Platform token cost ≈ $0; stored user keys become a high-value secret (vault built before first use); free-model quality and quotas cap the free experience; little or no revenue.
- **Revisit when:** Sustained demand for shared/team features, or AI costs the free pool and ads can no longer cover.
