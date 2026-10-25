## What and why

<!-- Link requirement IDs, e.g. FR-RUN-7, NFR-SEC-3 -->

## Checklist

- [ ] `pnpm verify` passes (lint, typecheck, test, build)
- [ ] Tests added/updated (security-sensitive code, cross-user 404 for new private procedures, counter atomicity)
- [ ] Docs updated (`PRD.md` / `docs/API.md` / `docs/DATABASE.md` / `ROADMAP.md` / `MEM.md`)
- [ ] No secrets, keys, private source or private prompts in logs, fixtures or errors
- [ ] Within PRD non-goals (or `MEM.md` entry proposing the change)
- [ ] Threat model (`SECURITY.md`) touched? Table updated
- [ ] Migration reviewed (expand → backfill → contract for breaking changes)

## Not verified

<!-- Be explicit about what you could not test -->
