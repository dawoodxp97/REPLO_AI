# Product improvement review — 5 November 2026

This is the feature map and next-pass backlog from exploring the current checkout, running its local services, and exercising its tests. It is not a claim that every feature has been redesigned or that every source file has received a security review. The existing PRD, architecture, and hard rules remain the build contract.

## Local environment

| Service       | Address                       | State                                                                                |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Product       | http://localhost:7101/login   | Development server                                                                   |
| Landing       | http://localhost:7100         | Development server                                                                   |
| API           | http://localhost:7200         | `/healthz` and `/readyz` return `{ok:true}`                                          |
| Worker        | http://localhost:7201/healthz | Returns `{ok:true}`                                                                  |
| PostgreSQL 17 | localhost:5433                | Migrations applied; separate `replo_test` database for destructive integration tests |

Docker Desktop restored a separate, older Replo stack on ports 3000 and 5432. It was left intact. This checkout uses ignored environment files for its API connection, landing canonical URL, and Compose port override. No OAuth credentials or model-provider keys were added. Email/password authentication needs no external configuration.

The legacy MinIO image could not be pulled. The current API has no object-storage configuration or consumer, so MinIO now belongs to the opt-in `storage` Compose profile. The default infrastructure command starts only PostgreSQL; Redis remains in the existing `later` profile.

To restart the current checkout after stopping the processes, run these from the repository root in separate terminals:

```sh
pnpm infra:up
pnpm dev
```

Since 9 November 2026 every dev server runs in the 7100/7200 range (MEM.md D-102), so `pnpm dev` no longer collides with that stack.

## Implemented in this pass

- Landing: shorter headline, paired introduction and action area, example navigation, a learning-path sidebar on wide screens, and a bounded, scrollable source pane. The matching citation links to the example source. Sample content remains explicitly labelled.
- Sign-in: a deliberate two-column desktop layout, repository-oriented onboarding copy, and the existing compact email form on phones. Social sign-in is offered only for providers enabled by the API. A provider-fetch failure leaves email usable and offers retry.
- Profile: connected methods remain visible; unconfigured providers cannot be connected through dead links. Availability failures have a retry action.
- Workspace: stronger page-title hierarchy, a current-section label, 40px navigation rows, and a keyboard skip link to the main content.
- Dashboard: a legible statistics band, a stronger resume entry, and an empty-state setup sequence with direct tutorial and key-management actions. Continue reading retains first position when a resume target exists.
- API contract: `INVALID_CREDENTIALS` returns 401 and `EMAIL_TAKEN` returns 409 instead of 500. Neither refusal issues a session.
- Notifications: a pushed unread count cancels an older pending count query before updating the cache, preventing a stale HTTP result from replacing the stream's newer value.
- Browser checks: accessibility fixtures now respect the theme under test, and the repositories empty-state check uses the current shared tutorial-action label.

## Feature map and remaining work

These are proposed improvements, not new product requirements. Priorities: P1 = next experience pass; P2 = subsequent refinement. External setup requirements are listed separately below.

| Feature and code entry point                                                                                       | What exists                                                                               | Next improvement and acceptance                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing and docs — `apps/landing/src/components/sections/`                                                         | Product example, grounding explanation, key guide, FAQ, draft policy pages                | P2: review the full content hierarchy and navigation across docs; verify a visitor can identify supported repositories, key requirements, and the next action without reading the entire page.                                                                          |
| Authentication — `features/session/`, API `modules/identity/`                                                      | Password, Google/GitHub OAuth, provider linking, session revocation                       | P1: preserve a safe internal destination through email and OAuth login. A signed-out `/import` visit should return to `/import`, rather than `/`. Reject external redirect destinations and test both flows.                                                            |
| Dashboard — `features/dashboard/`, API `modules/dashboard/`                                                        | Resume, counts, running jobs, recent activity, setup state                                | P1: make setup reflect whether a usable key is actually present; ensure jobs update without requiring a visit to the job page. Test empty, active-generation, failed-generation, and returning-reader states.                                                           |
| Repository import — `features/import/import-form.tsx`, API `modules/repositories/imports.service.ts`               | Public URL/App source, pre-flight, presets, audience, budget, estimate                    | P1: make the three sections a clear progressive flow, with an explicit explanation beside a disabled start action. Preserve user edits while defaults load. Test URL/ref changes and late estimates so an older result cannot appear current.                           |
| Keys and models — `features/keys/`, `features/settings/models-form.tsx`, API `modules/keys/` and `modules/models/` | Encrypted BYOK storage, validation, preset/custom roles, estimates                        | P1: unify key availability and validation messaging across onboarding, import, and settings; distinguish provider rejection from a transient check outage. Never expose a key beyond its last four characters.                                                          |
| Repository library — `features/repositories/`, API `modules/repositories/library.service.ts`                       | Imported repositories, latest job, removal                                                | P2: make repeat-generation and job recovery discoverable in each row; keep destructive effects named. Verify revoked/private access and pagination against live GitHub access changes.                                                                                  |
| Generation — `features/jobs/`, API `modules/generation/`, `jobs/`                                                  | Stage timeline, SSE replay, polling fallback, cancel/retry, checkpoints                   | P1: test killing a real worker mid-stage, then restarting it; verify checkpoint reuse, terminal status, and budget accounting. Refine reconnect and retry messaging from the actual failure code.                                                                       |
| Tutorial overview — `features/tutorials/`, API `modules/tutorials/`                                                | Objectives, outline, architecture, versions, draft/staleness banners                      | P1: make the first lesson/resume action and version context easy to locate. Review the density of objectives, provenance, and warnings at 320px and desktop widths.                                                                                                     |
| Lesson reader — `features/player/lesson-screen.tsx`                                                                | Outline/lesson/source panes, citations, commands, keyboard shortcuts, mobile source sheet | P1: review long real lessons and large code excerpts for reading measure, panel balance, and reference navigation. The selected reference, pinned version, and lesson position should remain obvious.                                                                   |
| Source explorer — `features/player/`, API tutorial source procedures                                               | Full tree, cited files, text retrieval, commit pinning                                    | P1: remove the per-chapter content requests used to discover cited paths (already recorded in MEM D-100). Add an explicit contract for cited paths or cited flags, then measure requests on large tutorials. P2: assess tree virtualisation using a 5,000-file fixture. |
| Quiz and progress — `features/quiz/`, `features/progress/`, API `modules/learning/`                                | Server grading, cited explanations, history, per-version progress, resume                 | P2: review wrong-answer recovery and chapter completion as one reading flow. Verify auto-advance, unavailable versions, cross-version completion, and keyboard/screen-reader announcements together.                                                                    |
| Tutorial library and sharing — `features/library/`, API tutorial manager                                           | Visibility, share token, licence gate, deletion, reports                                  | P1: clarify visibility and sharing actions per row without adding competing primary buttons. Verify expired/invalid links, private metadata, licence refusal, and revocation in the same journey.                                                                       |
| Search — `features/search/`, API `modules/search/`                                                                 | Debounced own-library search, grouped results, keyboard focus                             | P2: review retained old results while a new query is pending; distinguish short query, no results, and error states. Decide how repository hits can open the requested repository rather than the general list (MEM D-100).                                             |
| Notifications — `features/notifications/`, API `modules/notifications/`                                            | Unread SSE, HTTP fallback, list, mark/read/delete                                         | P1: extend race coverage to read/delete mutations concurrent with stream updates, visibility reconnect, and expired sessions. Keep unread count and list consistent. The initial HTTP/stream race is fixed in this pass.                                                |
| Settings — `features/settings/`, API settings and identity services                                                | Identity, provider links, preferences, keys, model defaults, account removal              | P2: group preference explanations around their visible effect in the reader. Password reset/email verification require a mail provider; provider disconnection and adding a password to OAuth accounts remain separate work.                                            |
| Operator and reliability — `features/operator/`, API `modules/operator/`, `platform/`                              | Restricted diagnostics, job detail, health, rate limits, retention                        | P1: classify remaining custom contract errors by HTTP status, with transport tests. P2: add backward operator pagination (MEM D-100), and measure polling/pool load before adding infrastructure.                                                                       |

Paths beginning with `features/` are under `apps/product/src/`. API module paths are under `apps/api/src/`.

## Visual acceptance for subsequent passes

- Build screens around actual actions and repository data. Keep generic feature cards, decorative gradients, ornamental icons, and fabricated usage metrics out of the interface.
- Keep graphite surfaces, purposeful semantic color, existing typefaces, and shared tokens. Use mono for paths, commits, counts, and costs; serif remains for lesson prose.
- Keep one clear next action per state. Loading, empty, failed, restricted, stale, and completed states need specific copy and usable recovery.
- Check 320px, phone, and desktop layouts; light/dark themes; keyboard navigation; reduced motion; and long repository names/code. No horizontal page scrolling.
- Preserve the contract boundary, source provenance, BYOK isolation, private-read checks, and the no-repository-execution rule while improving presentation.

## Verification and limits

The backend suite ran against a separate PostgreSQL 17 test database: 525 tests passed, including migrations, cross-user access, sessions, SSE, pipeline, keys, learning, and sharing. Product unit tests (173), contract tests (30), and browser tests (118, desktop and phone) passed. Lint and typecheck passed for all touched packages; product, landing, and API production builds passed. The landing has no unit-test files. Manual checks confirmed the live API's email-only sign-in, the landing citation anchor, and no horizontal page overflow at 320px. Browser regression coverage uses recorded API responses, not live GitHub or a real model.

No real GitHub App installation/OAuth round trip, paid model generation, worker-kill chaos run, staging/production deployment, legal review, or Lighthouse audit was performed. These are still required before claiming the full product is verified. See `ROADMAP.md`, `MEM.md`, and `docs/CODE_REVIEW.md` for the existing engineering backlog.
