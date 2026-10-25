# ADR-008 — No runnable code examples in the player in release 1

- **Status:** Accepted (22 Oct 2026). Extends [ADR-005](./005-read-only-github-no-code-execution.md) to generated examples.
- **Context:** The legacy app ran code snippets in a browser sandbox (Sandpack). The new product's examples are model output, and repository code is untrusted (ADR-005, RULES §0.1). The PRD already makes the player highlight-only (FR-LRN-10). Running model-written code in the player would widen the attack surface of the page (NFR-SEC-4) with no grounding benefit.
- **Decision:** Release 1 executes no code anywhere in the product: not repository code, not generated examples, not in the browser, not on the server. Code blocks are highlighted, copyable and carry source references. Active learning in R1 comes from quizzes (FR-LRN-5) and grounded exercises that do not run code.
- **Consequences:** No hands-on "edit and run" in R1. The legacy Sandpack player is not ported. The player's CSP and threat model stay smaller.
- **Revisit when:** A dedicated sandbox design passes a security review under ADR-005: a microVM in a separate cloud account, running generated examples only, never a user's repository with its dependencies installed.
