#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../../envs"

# 1. Validate Environment
ENV=${1:-}
if [[ ! "$ENV" =~ ^(dev|prod|demo)$ ]]; then
    echo "❌ Error: Invalid or missing environment."
    echo "Usage: $0 {dev|prod|demo}"
    exit 1
fi

# 2. Load Environment Variables to get the Network Name
if [ -f "$ENV_DIR/.env.$ENV" ]; then
    echo "📖 Loading environment: $ENV"
    set -a
    source "$ENV_DIR/.env.$ENV"
    set +a
else
    echo "❌ Error: .env.$ENV file not found in $ENV_DIR"
    exit 1
fi


# 3. Ensure the secret file exists (BETTER_AUTH_SECRET, POSTGRES_*, *_API_KEY viven aqui, gitignored).
#    Se cargan al shell para que docker compose los interpole (no viven en envs/ compartido).
if [ ! -f "$SCRIPT_DIR/.env.$ENV" ]; then
    echo "❌ Error: $SCRIPT_DIR/.env not found."
    echo "   Copia .env.example a .env.$ENV y set BETTER_AUTH_SECRET / POSTGRES_* / integration keys."
    exit 1
fi
set -a
source "$SCRIPT_DIR/.env.$ENV"
set +a

# 3b. Avisos de secretos débiles. NO abortan el deploy a propósito: avisar es lo útil.
if [ "${POSTGRES_PASSWORD:-}" = "control_tower" ]; then
    echo "⚠️  POSTGRES_PASSWORD sigue siendo la de por defecto ('control_tower')."
    echo "    Ahora la base vive en nbs-db, un cluster COMPARTIDO con n8n, Twenty y Zammad:"
    echo "    una contraseña por defecto aquí es una puerta abierta a ese cluster. Para rotarla:"
    echo "      1) pon la nueva en nbs-infra/postgres/.env  (CONTROL_TOWER_DB_PASSWORD)"
    echo "      2) pon la MISMA en $SCRIPT_DIR/.env.$ENV   (POSTGRES_PASSWORD)"
    echo "      3) nbs-infra/postgres/scripts/create-databases.sh $ENV   (aplica el ALTER ROLE)"
    echo "      4) vuelve a desplegar (los servicios se recrean y toman la nueva)"
fi
if [ -z "${BETTER_AUTH_SECRET:-}" ] || [ ${#BETTER_AUTH_SECRET} -lt 32 ]; then
    echo "❌ Error: BETTER_AUTH_SECRET falta o tiene menos de 32 caracteres."
    echo "   La web ya no arranca sin él (valida el entorno al bootstrap). Genera uno:"
    echo "     openssl rand -base64 32"
    exit 1
fi

# 4. Base de datos: control-tower ya NO lleva Postgres propio. Su database
#    `control_tower` vive en nbs-db, el cluster compartido del servidor, cuyos
#    datos persisten en NBS_DB_DATA_DIR (lo gestiona nbs-infra/postgres/).
# --- Esperar a nbs-db, el Postgres compartido -------------------------------
# La base de datos vive en OTRO compose (nbs-infra/postgres/), asi que
# `depends_on` no llega hasta aqui: `depends_on` no cruza proyectos de Compose.
# La espera la hace el deploy, que es quien si conoce a los dos.
NBS_DB_CONTENEDOR="${DOCKER_NBS_DB_DDNS:-nbs-db}.${ENV}"
if ! docker ps --format '{{.Names}}' | grep -qx "$NBS_DB_CONTENEDOR"; then
    echo "❌ Error: $NBS_DB_CONTENEDOR no esta corriendo."
    echo "   Es el Postgres compartido del servidor y se despliega ANTES que esto:"
    echo "     nbs-infra/postgres/deploy-postgres.sh $ENV"
    exit 1
fi
echo -n "⏳ Esperando a que $NBS_DB_CONTENEDOR este healthy"
for _ in $(seq 1 30); do
    ESTADO_DB=$(docker inspect -f '{{.State.Health.Status}}' "$NBS_DB_CONTENEDOR" 2>/dev/null || echo "?")
    [ "$ESTADO_DB" = "healthy" ] && break
    echo -n "."
    sleep 2
done
if [ "${ESTADO_DB:-}" != "healthy" ]; then
    echo " ✗"
    echo "❌ $NBS_DB_CONTENEDOR no llego a healthy. Revisa: docker logs $NBS_DB_CONTENEDOR"
    exit 1
fi
echo " ✓"

# 5. Create Network if it doesn't exist
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    echo "🌐 Creating shared network: $DOCKER_NETWORK..."
    docker network create "$DOCKER_NETWORK"
else
    echo "🌐 Shared network $DOCKER_NETWORK already exists."
fi

# 6. Deploy the Stack (web + worker; la base de datos es nbs-db)
echo "🚀 Starting control-tower-$ENV..."
docker compose --env-file "$ENV_DIR/.env.$ENV" -f "$SCRIPT_DIR/control-tower.docker-compose.$ENV.yml" up -d --build

# 7. Apply database migrations (idempotente). NO se traga el error: si la migración falla de verdad, el deploy
#    FALLA de forma visible (antes un `|| echo skipped` ocultaba fallos → riesgo de schema drift silencioso).
#    Se reintenta unas veces por si el worker/db aún se están calentando tras `up -d`.
echo "🗄️  Applying migrations..."
migrate_ok=false
for attempt in 1 2 3 4; do
    if docker compose --env-file "$ENV_DIR/.env.$ENV" -f "$SCRIPT_DIR/control-tower.docker-compose.$ENV.yml" \
        exec -T worker pnpm --filter @ct/db migrate; then
        migrate_ok=true
        break
    fi
    echo "… migración: intento $attempt falló (el worker aún se calienta); reintento en 5s"
    sleep 5
done
if [ "$migrate_ok" != "true" ]; then
    echo "❌ Migraciones fallidas tras varios intentos. Deploy abortado (revisa los logs del worker)."
    exit 1
fi

# 8. Perfil demo: sembrar datos ficticios. El seed hace TRUNCATE de todas las tablas
#    antes de insertar (UUIDs fijos, idempotente), así que cada despliegue de la demo
#    la deja en su estado canónico y se lleva por delante lo que hayan tocado los
#    visitantes. Eso es deseable en una demo pública, pero es destructivo: por eso
#    sólo corre en `demo`, nunca en prod ni en dev.
if [ "$ENV" = "demo" ]; then
    # SEED_DEMO_PASSWORD (en .env.demo) hace que el seed cree también la credencial de
    # owner@example.com. Sin ella la demo queda sin forma de entrar: el registro es
    # bootstrap-only y el usuario sembrado ya ocupa ese hueco.
    if [ -z "${SEED_DEMO_PASSWORD:-}" ]; then
        echo "❌ Falta SEED_DEMO_PASSWORD en $SCRIPT_DIR/.env.demo."
        echo "   Sin ella nadie podría iniciar sesión en la demo. Mínimo 8 caracteres."
        exit 1
    fi
    echo "🌱 Sembrando la demo (esto BORRA lo que haya en la BD de demo)..."
    docker compose --env-file "$ENV_DIR/.env.$ENV" -f "$SCRIPT_DIR/control-tower.docker-compose.$ENV.yml" \
        exec -T -e SEED_DEMO_PASSWORD="$SEED_DEMO_PASSWORD" worker pnpm --filter @ct/db seed
    echo "   Acceso a la demo: owner@example.com / (SEED_DEMO_PASSWORD)"
fi

echo "✅ control-tower-$ENV desplegado. Health: puerto ${CONTROL_TOWER_APP_EPORT}/api/health"
