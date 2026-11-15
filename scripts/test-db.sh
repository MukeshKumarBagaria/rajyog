#!/usr/bin/env bash
# Runs the Supabase migrations + seed + RLS/isolation tests against a
# throwaway local PostgreSQL cluster (no Docker needed).
#
#   npm run test:db
#
# Requires PostgreSQL 15+ server binaries (initdb, pg_ctl). If DATABASE_URL is
# set, an existing EMPTY database is used instead of a throwaway cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL_FLAGS=(-v ON_ERROR_STOP=1 -q -X)

run_sql() {
  local file="$1"
  echo "  → $(basename "$file")"
  psql "${PSQL_FLAGS[@]}" "$CONN" -f "$file" >/dev/null
}

cleanup() {
  if [[ -n "${PGTMP:-}" ]]; then
    $AS_PG "$PGBIN/pg_ctl" -D "$PGTMP/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$PGTMP"
  fi
}

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  [[ -x "$PGBIN/initdb" ]] || { echo "initdb not found; set PGBIN or DATABASE_URL" >&2; exit 1; }
  PGTMP="$(mktemp -d)"
  chmod 777 "$PGTMP"
  AS_PG=""
  if [[ "$(id -u)" == "0" ]]; then AS_PG="runuser -u postgres --"; fi
  trap cleanup EXIT
  PORT="${PGPORT_TEST:-54329}"
  $AS_PG "$PGBIN/initdb" -D "$PGTMP/data" -U postgres --auth=trust >/dev/null
  $AS_PG "$PGBIN/pg_ctl" -D "$PGTMP/data" -o "-p $PORT -k $PGTMP -c listen_addresses=''" -l "$PGTMP/log" -w start >/dev/null
  CONN="postgresql://postgres@/postgres?host=$PGTMP&port=$PORT"
else
  CONN="$DATABASE_URL"
fi

echo "Applying Supabase stub, migrations and seed…"
run_sql "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run_sql "$f"; done
run_sql "$ROOT/supabase/seed.sql"

echo "Running database tests…"
psql "${PSQL_FLAGS[@]}" "$CONN" -f "$ROOT/supabase/tests/10_rls_isolation.sql"
