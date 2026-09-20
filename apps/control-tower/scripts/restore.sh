#!/bin/bash
# Restaura un backup en una base (por defecto una base NUEVA, para probar sin tocar prod).
# Uso: ./scripts/restore.sh <archivo.sql.gz> [TARGET_DB]
# Para restaurar SOBRE la base real: TARGET_DB=control_tower ./scripts/restore.sh <archivo>
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-control-tower-db-dev}
POSTGRES_USER=${POSTGRES_USER:-control_tower}
FILE=${1:?Uso: restore.sh <archivo.sql.gz> [TARGET_DB]}
TARGET_DB=${2:-${TARGET_DB:-control_tower_restore}}

[ -f "$FILE" ] || { echo "❌ No existe $FILE"; exit 1; }

echo "♻️  Restaurando $FILE → base '$TARGET_DB' (en $DB_CONTAINER)"
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" >/dev/null
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";" >/dev/null
gunzip -c "$FILE" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 >/dev/null

TABLES=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" -tAc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';")
echo "✅ Restore OK → '$TARGET_DB' con $TABLES tablas."
