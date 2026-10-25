# ADR-004 — "The model points, the system quotes"

- **Status:** Accepted (blueprint §17.5, §8.3)
- **Context:** The core promise is trustworthy explanations. Models mis-state line numbers and can invent code.
- **Decision:** Models reference **symbol keys or short anchor quotes**; the validator resolves them to `(path, line range, blob SHA)` and inserts the excerpt. Unverifiable claims get one repair attempt, then are downgraded to _interpretation_ or dropped. The same validator runs for **every** model.
- **Consequences:** Zero fabricated code excerpts by construction; more validator engineering; some loss of fluency; weak models yield shorter or "Draft" tutorials, never ungrounded ones.
- **Revisit when:** Never for excerpts. Validation strictness is tuned by eval results (over-strict validation can drop useful content on weak models).
