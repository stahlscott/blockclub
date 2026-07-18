#!/usr/bin/env bash
set -euo pipefail

container_name="${SUPABASE_DB_CONTAINER:-supabase_db_blockclub}"
docker exec -i "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$(dirname "$0")/inspect-database-boundaries.sql"
