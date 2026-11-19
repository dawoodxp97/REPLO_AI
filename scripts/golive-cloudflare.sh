#!/usr/bin/env bash
#
# Go-live wizard: hosts Replo on Cloudflare (Workers, Workflows, Neon, R2).
# Walks through Neon, Cloudflare login, tokens, resource creation, worker
# secrets, first deploy and a smoke check.
#
# Captured values land in .env.cloudflare (git-ignored, mode 0600) and in
# GitHub Actions secrets when the gh CLI is available.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear wipes the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1 && tput clear 2>/dev/null; then return 0; fi
  printf '\033[2J\033[3J\033[H'
}

# banner "Title" shows the opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" clears the screen, then announces a stage and shows progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." prints a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." is a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL opens it in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else false; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

# pause "msg" waits for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" is a y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY: current value of KEY in ENV_FILE, if any, with write_env's single
# quotes or a plain dotenv double-quoted value undone.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line value sq="'\\''"; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  value="${line#*=}"
  if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; value="${value//"$sq"/\'}"
  elif [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
    [[ "$value" == *[\\\$\"]* ]] && return 1   # escapes, $ or ": can't decode safely; ask again
  fi
  printf '%s' "$value"
}

# ask KEY "Prompt" reads a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret), edited
# with Readline. Fails at EOF with no input.
ask() {
  local key="$1" prompt="$2" current input s=$'\001' e=$'\002' p rc=0
  current=$(_existing "$key" || true)
  # Readline needs the colour codes wrapped in \001..\002 to place the cursor.
  p="  $s$BOLD$e$prompt$s$RESET$e "
  [[ -n "$current" ]] && p+="$s$DIM$e[Enter keeps current]$s$RESET$e "
  read -e -r -p "$p" input || rc=1
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" is like ask, but input is hidden. If the terminal
# can't do hidden input (no TTY echo control), it retries visibly with a warning.
ask_secret() {
  local key="$1" prompt="$2" current input rc=0
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || rc=1
  if (( rc )) && [[ -z "$input" ]]; then
    warn "hidden input isn't supported here; the paste below will be visible on screen"
    read -e -r -p "  ${prompt} " input || return 1
  fi
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE upserts KEY='VALUE' into ENV_FILE (replaces any existing
# line) and sets $KEY. Idempotent. Creates ENV_FILE at mode 0600; writes through
# a symlink and keeps an existing file's mode.
write_env() {
  local key="$1" value="$2" tmp sq="'\\''"
  [[ -e "$ENV_FILE" ]] || (umask 077 && : > "$ENV_FILE")
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf "%s='%s'\n" "$key" "${value//\'/$sq}" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  printf -v "$key" '%s' "$value"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE sets a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

# set_var NAME VALUE sets a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

# finish clears, then shows a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES
# ──────────────────────────────────────────────────────────────────────────

# Prefer a global wrangler; fall back to the project devDependency via pnpm.
if command -v wrangler >/dev/null 2>&1; then
  wrangler() { command wrangler "$@"; }
else
  wrangler() { pnpm --filter @replo/api exec wrangler "$@"; }
fi

run_wizard() {

ENV_FILE=".env.cloudflare"
TOTAL_STAGES=10

banner "Replo → Cloudflare go-live"

# STAGE_FROM=7 ./scripts/golive-cloudflare.sh resumes at stage 7.
START_AT=${STAGE_FROM:-1}
# stage() prints this index, so resume-at-7 shows "Stage 7/10", not 1/10.
_STAGE_INDEX=$((START_AT - 1))
_should_run() { [[ $1 -ge $START_AT ]]; }
# Skipped stages would leave their variables unset, so restore everything
# the previous run captured.
if [[ -f "$ENV_FILE" ]]; then set -a; source "$ENV_FILE"; set +a; fi

# ── 1 · Preflight ─────────────────────────────────────────────────────────
if _should_run 1; then
stage "Preflight"
say "Checking the tools this wizard needs."
for tool in node pnpm wrangler curl; do
  if command -v "$tool" >/dev/null 2>&1; then
    note "  ✓ $tool ($(command -v "$tool"))"
  else
    warn "  ✗ $tool missing — pnpm add -g wrangler, or check PATH"
  fi
done
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  note "  ✓ gh CLI authenticated"
else
  warn "  gh CLI not ready — GitHub secrets will be skipped; set them later by hand"
fi
if git remote get-url origin >/dev/null 2>&1; then
  note "  ✓ git remote: $(git remote get-url origin)"
else
  warn "  no git remote — GitHub secrets need one"
fi
grep -q "^.env.cloudflare" .gitignore 2>/dev/null || { printf '\n.env.cloudflare\n' >> .gitignore; note "  ✓ .env.cloudflare added to .gitignore"; }
pause "Preflight done — press Enter for Neon."
fi

# ── 2 · Neon ──────────────────────────────────────────────────────────────
if _should_run 2; then
stage "Neon: project + connection string"
say "We need one serverless Postgres 17 project."
open_url "https://console.neon.tech/app/projects"
step "Sign in, then 'Create project' (name it replo)."
step "Keep the default Postgres 17 + region, click Create."
step "On the dashboard, 'Connect' → copy the connection string"
step "(pooled endpoint is fine; no password-in-URL worries — it's pasted hidden)."
ask_secret NEON_DATABASE_URL "Paste the Neon connection string:"
if [[ "$NEON_DATABASE_URL" != postgres* ]]; then
  warn "that does not look like a postgres:// URL — re-run this stage if it was wrong"
fi
write_env NEON_DATABASE_URL "$NEON_DATABASE_URL"
set_secret NEON_DATABASE_URL "$NEON_DATABASE_URL"
note "CI (deploy.yml → migrate job) uses NEON_DATABASE_URL to apply the DDL."
pause "Neon done — press Enter for Cloudflare login."
fi

# ── 3 · Cloudflare login ──────────────────────────────────────────────────
if _should_run 3; then
stage "Cloudflare: wrangler login"
say "This links the wrangler CLI to your Cloudflare account (no token needed yet)."
step "Running: wrangler login (a browser tab will open — click Allow)."
if confirm "Run 'wrangler login' now?"; then
  wrangler login
fi
if wrangler whoami >/dev/null 2>&1; then
  note "  ✓ wrangler authenticated"
  wrangler whoami 2>/dev/null | sed -n '1,8p' | sed 's/^/    /'
else
  warn "wrangler not authenticated yet — re-run this stage later"
fi
pause "Login done — press Enter for the account ID."
fi

# ── 4 · Account ID ────────────────────────────────────────────────────────
if _should_run 4; then
stage "Cloudflare: account ID"
say "One id, used by CI deploys and every wrangler call."
open_url "https://dash.cloudflare.com/"
step "On the dashboard home (or any domain's Overview page), copy the Account ID"
step "(right sidebar; a 32-hex string)."
ask CLOUDFLARE_ACCOUNT_ID "Paste the Cloudflare account ID:"
write_env CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
set_secret CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
pause "Account ID done — press Enter for the API token."
fi

# ── 5 · API token ─────────────────────────────────────────────────────────
if _should_run 5; then
stage "Cloudflare: scoped API token"
say "CI deploys and this wizard's resource creation both need a token."
open_url "https://dash.cloudflare.com/profile/api-tokens"
step "Create Token → 'Create Custom Token'."
step "Permissions (5 rows):  Account · Workers Scripts · Edit"
step "                        Account · Cloudflare D1 · Edit"
step "                        Account · Hyperdrive · Edit"
step "                        Account · Workers R2 Storage · Edit"
step "                        Zone · Zone · Read   (only if you will add custom domains)"
step "Account Resources: Include → your account. Create Token."
ask_secret CLOUDFLARE_API_TOKEN "Paste the API token:"
write_env CLOUDFLARE_API_TOKEN "$CLOUDFLARE_API_TOKEN"
set_secret CLOUDFLARE_API_TOKEN "$CLOUDFLARE_API_TOKEN"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
pause "Token done — press Enter for the app URLs."
fi

# ── 6 · URLs ──────────────────────────────────────────────────────────────
if _should_run 6; then
stage "App URLs"
say "One origin serves everything: the gateway Worker (landing at /, the app"
say "at /app, the API at /rpc and /auth). A custom domain can replace it later."
step "After the first deploy, Cloudflare prints the workers.dev subdomain."
step "The default below uses the gateway Worker name 'app'."
ask CF_SUBDOMAIN "Your workers.dev subdomain (from wrangler whoami, e.g. reploai):"
GATEWAY_URL="https://app.${CF_SUBDOMAIN:-REPLACE}.workers.dev"
printf '  %sdefault:%s %s\n' "$DIM" "$RESET" "$GATEWAY_URL"
ask GATEWAY_URL "Public URL [Enter = default]:"
[[ -z "${GATEWAY_URL// /}" ]] && GATEWAY_URL="https://app.${CF_SUBDOMAIN:-REPLACE}.workers.dev"
API_PUBLIC_URL="$GATEWAY_URL"
PRODUCT_ORIGIN="$GATEWAY_URL"
LANDING_URL="$GATEWAY_URL"
PRODUCT_URL="$GATEWAY_URL/app"
write_env GATEWAY_URL "$GATEWAY_URL"
write_env API_PUBLIC_URL "$API_PUBLIC_URL"
write_env PRODUCT_ORIGIN "$PRODUCT_ORIGIN"
write_env LANDING_URL "$LANDING_URL"
write_env PRODUCT_URL "$PRODUCT_URL"
note "These are baked into worker secrets and both frontends (NEXT_PUBLIC_*)."
note "If you add custom domains later, re-run from this stage and redeploy."
pause "URLs done — press Enter for resource creation."
fi

# ── 7 · Create resources ──────────────────────────────────────────────────
if _should_run 7; then
stage "Cloudflare: Hyperdrive, D1, R2"
say "Creating the resources the wrangler configs reference. Idempotent-ish:"
say "already-created names are skipped."
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-$( _existing CLOUDFLARE_API_TOKEN || true)}" 2>/dev/null || true
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-$( _existing CLOUDFLARE_ACCOUNT_ID || true)}"
step "Hyperdrive (pools Neon connections for the pipeline worker)."
ask HYPERDRIVE_ID "Press Enter to create, or paste an existing Hyperdrive id [auto]:"
if [[ -z "${HYPERDRIVE_ID:-}" ]]; then
  if wrangler hyperdrive create replo-hyperdrive --connection-string="$NEON_DATABASE_URL" 2>&1 | tee /tmp/cf-hyperdrive.log; then
    HYPERDRIVE_ID=$(grep -oE '\b[0-9a-f]{32}\b' /tmp/cf-hyperdrive.log | head -1 || true)
  else
    warn "hyperdrive create failed — create it in the dashboard (Workers & Pages → Hyperdrive) and paste the id"
    ask HYPERDRIVE_ID "Paste the Hyperdrive id:"
  fi
fi
[[ -n "${HYPERDRIVE_ID:-}" ]] || { ask HYPERDRIVE_ID "Paste the Hyperdrive id:"; }
if [[ -n "${HYPERDRIVE_ID:-}" ]] && grep -q '<HYPERDRIVE_ID>' apps/api/wrangler.pipeline.jsonc; then
  sed -i '' "s/<HYPERDRIVE_ID>/${HYPERDRIVE_ID}/" apps/api/wrangler.pipeline.jsonc
  note "  ✓ patched apps/api/wrangler.pipeline.jsonc"
fi
write_env HYPERDRIVE_ID "$HYPERDRIVE_ID"

step "D1 (OpenNext tag cache for the product)."
ask D1_DATABASE_ID "Press Enter to create, or paste an existing D1 id [auto]:"
if [[ -z "${D1_DATABASE_ID:-}" ]]; then
  if wrangler d1 create replo-product-tags 2>&1 | tee /tmp/cf-d1.log; then
    D1_DATABASE_ID=$(grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' /tmp/cf-d1.log | head -1 || true)
  else
    warn "d1 create failed — create it in the dashboard (Workers & Pages → D1) and paste the id"
    ask D1_DATABASE_ID "Paste the D1 database id:"
  fi
fi
[[ -n "${D1_DATABASE_ID:-}" ]] || { ask D1_DATABASE_ID "Paste the D1 database id:"; }
if [[ -n "${D1_DATABASE_ID:-}" ]] && grep -q '<D1_DATABASE_ID>' apps/product/wrangler.jsonc; then
  sed -i '' "s/<D1_DATABASE_ID>/${D1_DATABASE_ID}/" apps/product/wrangler.jsonc
  note "  ✓ patched apps/product/wrangler.jsonc (production; preview placeholder left)"
fi
write_env D1_DATABASE_ID "$D1_DATABASE_ID"

step "R2 buckets (OpenNext incremental cache + future backups)."
if ! wrangler r2 bucket info replo-product-cache >/dev/null 2>&1; then
  wrangler r2 bucket create replo-product-cache \
    || warn "R2 create failed — enable R2 in the dashboard (R2 Object Storage → Activate), then re-run with STAGE_FROM=7"
else
  note "  ✓ bucket replo-product-cache already exists"
fi
pause "Resources done — press Enter for the encryption key."
fi

# ── 8 · KEY_ENCRYPTION_KEY ────────────────────────────────────────────────
if _should_run 8; then
stage "Key vault encryption key"
say "BYOK provider keys are envelope-encrypted with this 32-byte key (MEM D-115)."
say "It must never change once keys are stored, and never enters git."
ask KEY_ENCRYPTION_KEY "Press Enter to generate a fresh key, or paste an existing one [auto]:"
if [[ -z "${KEY_ENCRYPTION_KEY:-}" ]]; then
  KEY_ENCRYPTION_KEY=$(openssl rand -base64 32)
  note "  generated a fresh 32-byte key"
fi
write_env KEY_ENCRYPTION_KEY "$KEY_ENCRYPTION_KEY"
pause "Encryption key saved — press Enter for worker secrets."
fi

# ── 9 · Worker secrets ────────────────────────────────────────────────────
if _should_run 9; then
stage "Worker secrets (replo-api + replo-pipeline)"
say "Every secret is pushed with 'wrangler secret put' for both workers —"
say "nothing is echoed back. GitHub App creds come from your live app."
open_url "https://github.com/settings/apps"
note "  If you already have the Replo GitHub App, copy its values; otherwise"
note "  create it: name replo, Homepage URL = $PRODUCT_ORIGIN,"
note "  Webhook = inactive, Permissions: Contents + Metadata (read-only),"
note "  Request user access (email), and 'Where can it be installed: any account'."
ask GITHUB_APP_ID "GitHub App ID (numeric):"
step "Private key: give the path to the downloaded .pem; it is base64'd for you."
ask GITHUB_APP_PEM_PATH "Path to the app's private key .pem:"
GITHUB_APP_PRIVATE_KEY=$(base64 < "$GITHUB_APP_PEM_PATH" | tr -d '\n')
ask GITHUB_APP_CLIENT_ID "GitHub App Client ID:"
ask_secret GITHUB_APP_CLIENT_SECRET "GitHub App Client Secret:"
ask GITHUB_APP_SLUG "GitHub App slug (the URL name, e.g. replo):"
open_url "https://console.cloud.google.com/apis/credentials"
step "OAuth 2.0 Client (Web) for Google sign-in — authorized redirect URI:"
step "  $API_PUBLIC_URL/auth/google/callback"
ask GOOGLE_CLIENT_ID "Google OAuth Client ID (Enter to skip):"
if [[ -n "${GOOGLE_CLIENT_ID:-}" ]]; then
  ask_secret GOOGLE_CLIENT_SECRET "Google OAuth Client Secret:"
fi
ask ADMIN_EMAILS "Admin email(s), comma-separated (become operators):"

put_secret() {
  local name="$1" value="$2"
  for cfg in "-c wrangler.jsonc" "-c wrangler.pipeline.jsonc"; do
    if printf '%s' "$value" | wrangler secret put "$name" $cfg >/dev/null 2>&1; then
      note "  ✓ $name → both workers"
    else
      warn "  ✗ $name ($cfg) — set later: wrangler secret put $name $cfg"
    fi
  done
}
put_secret DATABASE_URL "$NEON_DATABASE_URL"
put_secret KEY_ENCRYPTION_KEY "$KEY_ENCRYPTION_KEY"
put_secret API_PUBLIC_URL "$API_PUBLIC_URL"
put_secret PRODUCT_ORIGIN "$PRODUCT_ORIGIN"
put_secret ADMIN_EMAILS "$ADMIN_EMAILS"
put_secret GITHUB_APP_ID "$GITHUB_APP_ID"
put_secret GITHUB_APP_PRIVATE_KEY "$GITHUB_APP_PRIVATE_KEY"
put_secret GITHUB_APP_CLIENT_ID "$GITHUB_APP_CLIENT_ID"
put_secret GITHUB_APP_CLIENT_SECRET "$GITHUB_APP_CLIENT_SECRET"
put_secret GITHUB_APP_SLUG "$GITHUB_APP_SLUG"
if [[ -n "${GOOGLE_CLIENT_ID:-}" ]]; then
  put_secret GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
  put_secret GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET"
fi
write_env GITHUB_APP_ID "$GITHUB_APP_ID"
write_env GITHUB_APP_CLIENT_ID "$GITHUB_APP_CLIENT_ID"
write_env GITHUB_APP_SLUG "$GITHUB_APP_SLUG"
pause "Secrets done — press Enter for the first deploy."
fi

# ── 10 · First deploy + smoke check ───────────────────────────────────────
if _should_run 10; then
stage "First deploy + smoke check"
say "Deploys locally with the same scripts CI uses. Expect ~5 minutes."
if confirm "Apply the DDL to Neon now (pnpm --filter @replo/api db:migrate)?"; then
  DATABASE_URL="$NEON_DATABASE_URL" pnpm --filter @replo/api db:migrate
fi
if confirm "Deploy landing (build + wrangler deploy)?"; then
  export NEXT_PUBLIC_APP_URL="$PRODUCT_URL" NEXT_PUBLIC_SITE_URL="$LANDING_URL"
  pnpm cf:landing:deploy
fi
if confirm "Deploy product (OpenNext build + wrangler deploy)?"; then
  export NEXT_PUBLIC_API_URL="$API_PUBLIC_URL" NEXT_PUBLIC_APP_URL="$PRODUCT_URL"
  pnpm cf:product:deploy
fi
if confirm "Deploy API + pipeline workers (Fastify + Workflows)?"; then
  pnpm cf:pipeline:deploy
  pnpm cf:api:deploy
fi
if confirm "Deploy gateway (one public origin)?"; then
  pnpm cf:gateway:deploy
fi
ask API_HEALTH_URL "Public URL to smoke-check (the gateway, e.g. https://app.REPLACE.workers.dev):"
if curl -fsS "$API_HEALTH_URL/healthz" >/dev/null 2>&1; then
  note "  ✓ API /healthz answered OK"
else
  warn "/healthz did not answer — check 'wrangler tail replo-api' for the error"
fi
ask LANDING_URL "Landing URL to smoke-check (Enter to skip):"
if [[ -n "${LANDING_URL:-}" ]]; then
  if curl -fsS -o /dev/null "$LANDING_URL" 2>&1; then note "  ✓ landing answered"; else warn "  landing did not answer"; fi
fi
say "Next: push to main and GitHub Actions redeploys automatically (deploy.yml)."
say "Remaining R9 hardening: staged rollout, backups to R2, alerts, live E2E."
fi

finish
}

run_wizard "$@"; exit
