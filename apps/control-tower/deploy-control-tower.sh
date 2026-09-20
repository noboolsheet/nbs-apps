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

# 2b. Guarda de interfaz. En prod los puertos van atados a la IP de Tailscale de vibox,
#     no a 0.0.0.0: es lo que mantiene privadas las apps con datos reales ahora que la
#     máquina sí tiene IP pública. Sin esto, un envs/ a medio rellenar publica en abierto.
if [[ "$DOCKER_IFACE" == *CAMBIAME* ]]; then
    echo "❌ DOCKER_IFACE sigue sin rellenar en $ENV_DIR/.env.$ENV (valor: '$DOCKER_IFACE')."
    echo "   Pon la IP de Tailscale de vibox:  tailscale ip -4"
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

# 3b. Avisos de secretos débiles. NO abortan el deploy a propósito: rotar la contraseña de Postgres con la
#     base ya creada exige un `ALTER USER` además de cambiar el .env, así que abortar dejaría al owner sin
#     poder desplegar hasta hacer una migración de credenciales a destiempo. Avisar es lo útil.
if [ "${POSTGRES_PASSWORD:-}" = "control_tower" ]; then
    echo "⚠️  POSTGRES_PASSWORD sigue siendo la de por defecto ('control_tower')."
    echo "    En prod la red Docker aísla el 5432, pero es un endurecimiento trivial. Para rotarla:"
    echo "      1) docker exec -it <db> psql -U control_tower -c \"ALTER USER control_tower WITH PASSWORD '<nueva>';\""
    echo "      2) actualiza POSTGRES_PASSWORD en $SCRIPT_DIR/.env"
    echo "      3) vuelve a desplegar (los servicios se recrean y toman la nueva)"
fi
if [ -z "${BETTER_AUTH_SECRET:-}" ] || [ ${#BETTER_AUTH_SECRET} -lt 32 ]; then
    echo "❌ Error: BETTER_AUTH_SECRET falta o tiene menos de 32 caracteres."
    echo "   La web ya no arranca sin él (valida el entorno al bootstrap). Genera uno:"
    echo "     openssl rand -base64 32"
    exit 1
fi

# 4. Persistencia de PostgreSQL (control-tower-db).
#    prod: bind-mount a $CONTROL_TOWER_DATA_DIR (/opt/noboolsheet/...), hay que crear el dir.
#    dev:  volumen Docker con nombre (lo crea Docker solo) — evita el lio de File Sharing
#          de Docker Desktop en Mac con rutas /opt.
if [ "$ENV" != "dev" ]; then
    if [ -z "${CONTROL_TOWER_DATA_DIR:-}" ]; then
        echo "❌ Error: CONTROL_TOWER_DATA_DIR is not set in .env.$ENV"
        exit 1
    fi
    echo "📁 Ensuring data dir at $CONTROL_TOWER_DATA_DIR..."
    sudo mkdir -p "$CONTROL_TOWER_DATA_DIR"
fi

# 5. Create Network if it doesn't exist
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    echo "🌐 Creating shared network: $DOCKER_NETWORK..."
    docker network create "$DOCKER_NETWORK"
else
    echo "🌐 Shared network $DOCKER_NETWORK already exists."
fi

# 6. Deploy the Stack (web + worker + control-tower-db)
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
    echo "… migración: intento $attempt falló (worker/db calentando); reintento en 5s"
    sleep 5
done
if [ "$migrate_ok" != "true" ]; then
    echo "❌ Migraciones fallidas tras varios intentos. Deploy abortado (revisa los logs del worker)."
    exit 1
fi

echo "✅ control-tower-$ENV desplegado. Health: puerto ${CONTROL_TOWER_APP_EPORT}/api/health"
