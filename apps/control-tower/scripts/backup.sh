#!/bin/bash
# Backup de la base de Control Tower (pg_dump comprimido, con timestamp).
# Uso: ./scripts/backup.sh   (variables DB_CONTAINER/POSTGRES_USER/POSTGRES_DB/BACKUP_DIR opcionales)
#
# Por defecto apunta al Postgres del `compose.yml` local (self-contained). En el
# SERVIDOR la base vive en nbs-db, el cluster compartido, y hay que decírselo:
#   DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
#     POSTGRES_DB=control_tower BACKUP_DIR=/opt/noboolsheet/control-tower-backups \
#     ./scripts/backup.sh
#
# (En el servidor, `nbs-infra/scripts/backup.sh` ya copia esta y el resto de
#  databases del cluster a diario; esto es para copias puntuales.)
set -euo pipefail
DB_CONTAINER=${DB_CONTAINER:-control-tower-db-dev}
# Usuario del SISTEMA dentro del contenedor. En nbs-db hace falta 'postgres' para
# entrar por el socket local con permisos de superusuario.
DB_EXEC_USER=${DB_EXEC_USER:-}
EXEC_ARGS=(); [ -n "$DB_EXEC_USER" ] && EXEC_ARGS=(-u "$DB_EXEC_USER")
POSTGRES_USER=${POSTGRES_USER:-control_tower}
POSTGRES_DB=${POSTGRES_DB:-control_tower}
BACKUP_DIR=${BACKUP_DIR:-./backups}
RETENTION=${RETENTION:-14} # nº de backups a conservar

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/control-tower-$TS.sql.gz"

echo "📦 pg_dump $POSTGRES_DB desde $DB_CONTAINER → $FILE"
docker exec "${EXEC_ARGS[@]}" "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$FILE"

# Rotación: conserva los N más recientes.
ls -1t "$BACKUP_DIR"/control-tower-*.sql.gz 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -f

SIZE=$(du -h "$FILE" | cut -f1)
echo "✅ Backup OK ($SIZE). Backups en $BACKUP_DIR:"
ls -1t "$BACKUP_DIR"/control-tower-*.sql.gz 2>/dev/null | head -5
