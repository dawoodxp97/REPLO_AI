#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/../../.." && pwd)"
ddl_dir="${script_dir}/../db/ddl"
shopt -s nullglob
ddl_files=("${ddl_dir}"/[0-9]*.sql)
if (( ${#ddl_files[@]} == 0 )); then
  echo "No numbered DDL files found in ${ddl_dir}" >&2
  exit 1
fi

cd "${repo_root}"
compose=(docker compose -f "${repo_root}/docker-compose.yml")
psql=("${compose[@]}" exec -T postgres psql --set ON_ERROR_STOP=1 --username app --dbname replo)

echo "Resetting the public schema in the Compose database (app/replo)"
"${psql[@]}" --command 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

for ddl_file in "${ddl_files[@]}"; do
  echo "Applying ${ddl_file##*/}"
  "${psql[@]}" --file - < "${ddl_file}"
done
