#!/bin/bash
# Restaura un backup en una base (por defecto una base NUEVA, para probar sin tocar prod).
# Uso: ./scripts/restore.sh <archivo.sql.gz> [TARGET_DB]
# Para restaurar SOBRE la base real: TARGET_DB=control_tower ./scripts/restore.sh <archivo>
#
# En el SERVIDOR la base vive en nbs-db, el cluster compartido. Crear una database
# exige el superusuario (el rol `control_tower` sólo es propietario de la suya):
#   DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
#     ./scripts/restore.sh <backup.sql.gz>
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-control-tower-db-dev}
# Usuario del SISTEMA dentro del contenedor (en nbs-db: 'postgres').
DB_EXEC_USER=${DB_EXEC_USER:-}
EXEC_ARGS=(); [ -n "$DB_EXEC_USER" ] && EXEC_ARGS=(-u "$DB_EXEC_USER")
POSTGRES_USER=${POSTGRES_USER:-control_tower}
FILE=${1:?Uso: restore.sh <archivo.sql.gz> [TARGET_DB]}
TARGET_DB=${2:-${TARGET_DB:-control_tower_restore}}

[ -f "$FILE" ] || { echo "❌ No existe $FILE"; exit 1; }

echo "♻️  Restaurando $FILE → base '$TARGET_DB' (en $DB_CONTAINER)"
docker exec "${EXEC_ARGS[@]}" "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";" >/dev/null
docker exec "${EXEC_ARGS[@]}" "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\";" >/dev/null
gunzip -c "$FILE" | docker exec -i "${EXEC_ARGS[@]}" "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" -v ON_ERROR_STOP=1 >/dev/null

TABLES=$(docker exec "${EXEC_ARGS[@]}" "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" -tAc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';")
echo "✅ Restore OK → '$TARGET_DB' con $TABLES tablas."
