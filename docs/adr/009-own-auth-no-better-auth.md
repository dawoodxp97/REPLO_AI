# ADR-009 — Own authentication instead of Better Auth

- **Status:** Accepted (26 Oct 2026). Replaces the Better Auth choice made for B1 ([ROADMAP](../../ROADMAP.md)). The GitHub App choice in [ADR-005](./005-read-only-github-no-code-execution.md) is unchanged.
- **Context:** Better Auth provided GitHub sign-in, sessions and a Drizzle adapter, but the product needs three sign-in methods (GitHub, Google, email and password), a GitHub token that is sealed with our own key, and control over the session and linking rules. Its generated schema and cookie contract are not ours to change, and its token encryption depended on the auth secret.
- **Decision:** `apps/api/src/modules/identity` owns authentication.
  - Passwords are hashed with scrypt from `node:crypto` (N = 2^15, r = 8, p = 1), with a per-password salt.
  - A session is an opaque 256-bit token in the `replo_session` cookie (httpOnly, SameSite=Lax, Secure in production, 30 days). The database stores only its SHA-256 (`session.token_hash`).
  - Google and GitHub use the OAuth 2 authorization-code flow with PKCE and a state value, held in a 10-minute `replo_oauth` cookie. The GitHub token is stored sealed by the key vault (`KEY_ENCRYPTION_KEY`, associated data `github-token:<userId>`). Google tokens are not stored.
  - A provider login links to an existing account only when the provider verified that email and the account's email is also verified. An unverified password account is refused (`ACCOUNT_EXISTS`) rather than merged.
  - Email verification and password reset are not built. They need a mail provider, which the product does not have yet.
- **Consequences:** We own the auth code and its tests (`password`, `session`, `oauth`, `auth.route`, and DB tests in `auth.integration.test.ts`). Sessions can be revoked in one place. The `auth_identity` table replaces Better Auth's `account`, and migration `0009` carries the GitHub links over without their tokens, so those users sign in with GitHub once more. Until email verification exists, a password account can exist for an email that no one has verified.
- **Revisit when:** A mail provider is chosen (add verification and reset), or a customer needs SAML or SCIM. Also revisit if the OAuth or session code needs a change that would be simpler in a maintained library.
