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


# 3. Ensure the Gemini secret file exists (GEMINI_API_KEY lives here, gitignored).
if [ ! -f "$SCRIPT_DIR/.env.$ENV" ]; then
    echo "❌ Error: $SCRIPT_DIR/.env not found."
    echo "   Copia .env.example a .env.$ENV y set GEMINI_API_KEY."
    exit 1
fi

# 4. Persistencia de la BD SQLite (usuarios + CVs).
#    prod: bind-mount a $CV_CREATOR_DATA_DIR (/opt/noboolsheet/...), hay que crear el dir.
#    dev:  volumen Docker con nombre (lo crea Docker solo) — evita el lio de File Sharing
#          de Docker Desktop en Mac con rutas /opt.
if [ "$ENV" != "dev" ]; then
    if [ -z "${CV_CREATOR_DATA_DIR:-}" ]; then
        echo "❌ Error: CV_CREATOR_DATA_DIR is not set in .env.$ENV"
        exit 1
    fi
    echo "📁 Ensuring data dir at $CV_CREATOR_DATA_DIR..."
    # El contenedor corre como root, asi que basta con crear el dir (lo escribe root).
    sudo mkdir -p "$CV_CREATOR_DATA_DIR"
fi

# 5. Create Network if it doesn't exist
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    echo "🌐 Creating shared network: $DOCKER_NETWORK..."
    docker network create "$DOCKER_NETWORK"
else
    echo "🌐 Shared network $DOCKER_NETWORK already exists."
fi

# 6. Deploy the Stack
echo "🚀 Starting cv-creator-$ENV..."
docker compose --env-file "$ENV_DIR/.env.$ENV" -f "$SCRIPT_DIR/cv-creator.docker-compose.$ENV.yml" up -d --build
