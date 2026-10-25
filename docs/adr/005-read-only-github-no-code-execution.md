# ADR-005 — Read-only GitHub access and no execution of repository code

- **Status:** Accepted (blueprint §17.6, §7, §11)
- **Context:** Private source is the most sensitive asset; repositories can contain malicious scripts and injected instructions.
- **Decision:** GitHub **App** (not OAuth App) with Contents + Metadata read-only and per-repo token scoping. Repositories are never built, installed or run on product infrastructure. Any future execution happens only in microVM sandboxes in a **separate cloud account**, on generated examples — never a user's repo with dependencies installed.
- **Consequences:** Type-aware precise analysis that needs installed dependencies is unavailable; analysis relies on static methods (tree-sitter + own module resolution + framework adapters). References are syntactic ("likely"), not proven.
- **Revisit when:** Only with a dedicated isolated-indexer design and a security review (e.g. running `scip-typescript` without installs).
