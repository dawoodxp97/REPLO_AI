# ADR-003 — No embeddings in release 1

- **Status:** Accepted (blueprint §17.4, §7.6)
- **Context:** Tutorial generation works on one snapshot with a full static index. Practitioner evidence (Claude Code moving from vector DB to agentic search) and the precision needs of grounding favour lexical + graph retrieval. A vector index is another copy of private code to protect.
- **Decision:** Ship with graph expansion + lexical search (BM25/trigram) + model-guided selection. Keep pgvector installed and the `chunks` table designed (phase 2).
- **Consequences:** Simpler pipeline and less data to protect; possible recall gaps on vague conceptual chat questions.
- **Revisit when:** Eval case E3 shows retrieval misses that embeddings fix (typically when tutor chat launches). HNSW only for cross-repo search — retrieval is always scoped to one snapshot, where exact search has perfect recall.
