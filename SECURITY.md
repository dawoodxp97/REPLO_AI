# SECURITY.md

Two risks could end Replo: **leaking a customer's private source code** and **executing attacker-controlled code on our infrastructure**. The design answers both structurally. Source: blueprint §11. This file is the checklist reviewers and agents use; update it in the same PR as any change that touches a control.

## Core principles

1. Repository content is **untrusted data**: never instructions, never executed, never installed.
2. Least privilege everywhere: GitHub **Contents + Metadata read-only**, per-repo token scope, per-role DB users, worker egress allow-list.
3. Strict tenant scoping: every private row has `user_id`; foreign IDs → **404**.
4. A hijacked model can at worst produce a wrong lesson: tools are read-only and snapshot-scoped, output is schema-validated, refs are re-resolved by code, links are allow-listed, the renderer escapes text.
5. User API keys are the most valuable secret after GitHub tokens: envelope-encrypted, worker-only, never returned, never logged.

## Threat model and release-1 controls

| #   | Threat                                             | Controls                                                                                                                                | Verify with                                         |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Private source exposure (tenants, logs, providers) | User-scoped services; private blobs only via authorised API; no prompt/completion logging for private repos; no-training provider terms | Cross-user tests; log scan                          |
| 2   | Excessive GitHub permissions                       | Read-only Contents + Metadata; per-repo selection                                                                                       | GitHub App manifest review                          |
| 3   | Leaked GitHub App key / installation tokens        | App key in secret store; tokens minted per job, scoped to one repo, in memory only, redacted                                            | Log redaction test                                  |
| 4   | Cross-user access (IDOR)                           | `scoped(userId)` repo helper; auth in every service call; 404 on foreign IDs                                                            | **CI cross-user tests for every private procedure** |
| 5   | Prompt injection in repo content                   | Labelled data sections; read-only snapshot-scoped tools; schema-validated output; system inserts excerpts; link allow-list              | Injection cases in `tools/evals`                    |
| 6   | Malicious dependencies / install scripts           | **Never install or run repo deps**; our repo uses pnpm `strictDepBuilds` + release-age gate                                             | CI lockfile + audit                                 |
| 7   | Remote code execution                              | No execution of repo code; tree-sitter as WASM with per-file timeouts; non-root, read-only FS, `no-new-privileges`                      | Container config review                             |
| 8   | SSRF                                               | GitHub URLs only, parsed to owner/repo; egress allow-list; fixed provider base URLs                                                     | URL-parser unit tests                               |
| 9   | Path traversal / archive bombs                     | Reject abs paths, `..`, symlinks, hardlinks, device entries; byte, entry-count, ratio caps; patched tar lib                             | `repo-analysis` fixtures (`isSafeArchivePath`)      |
| 10  | Poisoned/misleading generated content              | Grounding validation; interpretation labels; commands rendered as text with warning; report + takedown                                  | Eval suite                                          |
| 11  | Unsafe Markdown / XSS                              | Allow-list renderer, no raw HTML; Mermaid `strict`; strict CSP with nonces                                                              | CSP header test; renderer tests                     |
| 12  | DoS via huge repos                                 | Pre-flight caps; streaming abort; per-stage timeouts; per-user concurrency                                                              | Fixture tests                                       |
| 13  | Abuse of expensive AI ops (OWASP LLM10)            | Per-job budget ceiling; import rate limits; account-age/velocity checks; per-user and per-IP limits                             | Budget concurrency test                              |
| 14  | Webhook spoofing / replay                          | HMAC-SHA256 over **raw** body, constant-time compare; dedupe `X-GitHub-Delivery`                                                        | `github/webhook` tests                              |
| 15  | Secrets in repos or in our logs                    | Exclude `.env*`; secret-pattern scan before generation; redact excerpts; log redaction                                                  | Scanner + log tests                                 |
| 16  | Unauthorised tutorial access                       | Visibility check on every read; unguessable share tokens; `Cache-Control: private` for non-public; OG only for public                   | Service tests                                       |
| 17  | Session / CSRF                                     | httpOnly, Secure, SameSite=Lax; Origin check on state-changing RPC                                                                      | Integration test                                    |
| 18  | Deletion/revocation not honoured                   | Webhook-driven `revoked_at`, immediate hide, scheduled blob purge; cascading account delete                                             | Webhook + deletion tests                            |

## BYOK keys and provider use

| Risk                               | Controls                                                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stolen user keys                   | AES-256-GCM envelope encryption; KEK only in server secret store (never DB/backups); decrypted only in worker memory for that job; masked `…last4`; **test fails if a key-shaped string reaches logs**; delete is immediate |
| Keys sent to the wrong place       | Fixed provider base URLs; no custom endpoints; no platform-owned keys; a failing user key never falls back to another key or provider                                                                                       |
| Keys used beyond their job         | Each job uses only the key it started with; keys are decrypted only in the worker, for that job; deleting a key fails its running jobs with `KEY_REMOVED`                                                                  |
| Surprise provider bills            | Estimate before every run; user-chosen budget ceiling (default $2); tokens and cost recorded per LLM call from the provider's own usage; no retries beyond policy                                                           |
| Repo code sent to a provider       | The user chooses the provider and sees which one will receive their code; the key guide states that code goes to that provider under its terms                                                                              |
| Ads and tracking                   | None. No ads, ever (ADR-007). Third-party scripts need a reason recorded in `MEM.md` first                                                                                                                                  |

## Controls by layer

| Layer      | Controls                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API        | Own sessions (hashed tokens, httpOnly cookies); scrypt passwords; OAuth with state and PKCE; authz per procedure; Zod via contracts; rate limits (IP + user); idempotency keys; Origin checks; strict CORS to product origin; webhook HMAC |
| Database   | Separate least-privilege roles (api / worker / migrator); TLS; per-user scoping; no tokens stored; backups; RLS as future defence in depth                          |
| Worker     | Non-root; read-only root FS + `noexec` temp volume; egress allow-list; per-job temp dir wiped; no installs; per-stage timeouts and memory limits                    |
| Model      | Read-only snapshot-scoped tools; budgets; output schemas; no private prompts logged; vendor terms checked                                                           |
| Storage    | Private buckets; SSE; keys namespaced by repo; lifecycle deletion; access only through the API                                                                      |
| Deployment | Secrets in platform store; separate staging/prod credentials and GitHub Apps; pinned images; dependency scanning in CI                                              |

## Retention and deletion

Tarballs ≤ 24 h · private blobs only while a version/link references them · `job_events` and `llm_calls` 90 days · prompts/completions for private repos **not stored** (hashes + token counts) · uninstall/repo-removal webhook sets `revoked_at`, hides tutorials, schedules purge · account deletion removes keys, progress, private tutorials, blobs.

## Licensing (public tutorials)

Public tutorials only for repos with an OSI-approved licence; show licence + attribution; takedown process. _Not legal advice — confirm with counsel before public launch._

## Secure-development checklist (every PR touching these areas)

- [ ] No secret/key/source-code/private-prompt in logs, errors or Sentry events
- [ ] New private procedure has a cross-user 404 test
- [ ] New external URL/host is allow-listed and constructed server-side
- [ ] New Markdown/HTML sink uses the allow-list renderer
- [ ] New dependency reviewed (scripts, maintainers, licence); `allowBuilds` change justified
- [ ] New shared counter enforced atomically in SQL
- [ ] Threat table above updated if a control changed

## Reporting

Pre-launch: report issues to the repo owner privately. Add a `security.txt` and a public security page before open beta (users hesitating to connect private code is a top risk).
