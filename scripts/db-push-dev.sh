#!/usr/bin/env bash
# Apply supabase/migrations/*.sql to your dev Supabase project.
# Uses the IPv4 session pooler (direct db.*.supabase.co requires IPv6 on some networks).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

REF="${SUPABASE_PROJECT_ID:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
REGION="${SUPABASE_DB_REGION:-eu-west-1}"

if [[ -z "$REF" || -z "$DB_PASSWORD" ]]; then
  echo "Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD in .env"
  exit 1
fi

# Pipe password on stdin — safe for any characters (quotes, $, etc.)
ENC_PASSWORD="$(
  printf '%s' "$DB_PASSWORD" | python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""))'
)"
DB_URL="postgresql://postgres.${REF}:${ENC_PASSWORD}@aws-0-${REGION}.pooler.supabase.com:5432/postgres"

echo "Applying migrations to ${REF} (pooler ${REGION})..."
npx supabase db push --db-url "$DB_URL"

echo "Done. Restart npm run dev if it is already running."
