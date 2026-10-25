# ADR-007 — BYOK only, free for everyone, no billing ever

- **Status:** Accepted (22 Oct 2026). Supersedes [ADR-006](./006-individual-developers-byok-free-pool.md) on run sources, the free pool, credits and ads.
- **Context:** The founder decided Replo will never charge users and never pay for their AI. Keeping a platform-funded free pool, prepaid credits and ad revenue added quotas, a wallet ledger, ad compliance and a second class of user-visible limits, none of which the product needs. Every tutorial can run on a key the user already owns.
- **Decision:**
  1. Replo is free for everyone. There is no pricing, subscription, billing, prepaid credits, top-ups or ads, now or later. Anything that looks like one of these is out of scope and is removed rather than feature-flagged.
  2. The AI layer is **BYOK only**. Every generation job runs on one of the user's stored keys. The platform holds **no** LLM provider keys. A key failure fails the job; nothing falls back to another key or provider.
  3. Supported providers: **OpenRouter, OpenAI, Google AI Studio, Anthropic**. Base URLs stay fixed in code.
  4. **OpenRouter is the one recommended provider** (onboarding, key form, docs). One key reaches many models, including `:free` models that cost the user nothing. The other three are supported but not recommended.
  5. Private and public repos are both allowed for every user with a key. The lite pipeline is a cost and quality mode (presets `free` and `budget`), not a free-tier restriction.
  6. Model presets remain (`free · budget · balanced · quality · custom`). `free` requires an OpenRouter key and `:free` models only.
  7. The per-job budget ceiling stays (default $2). It protects the user's own provider bill, which is the only money involved.
- **Consequences:**
  - Platform AI cost is zero by construction. Hosting is the only fixed cost.
  - Activation depends on users getting a key. Mitigation: the OpenRouter recommendation and a short key guide. Measure key-setup drop-off (metric to add in PRD §10).
  - The quota machinery (atomic free-pool counters, credit ledger, ad accounting) is deleted before it was ever built or deployed. The schema and migration `0000` are regenerated; no live database exists yet.
  - Public tutorial pages carry no ads, so acquisition relies on the public tutorial pages and sharing alone.
  - The vault stays on the critical path: it now holds every user's only way to run a job.
- **Revisit when:** Never for billing or ads. Revisit only the provider list or the recommended provider, through a new ADR.
</content>
