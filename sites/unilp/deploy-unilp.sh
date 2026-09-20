#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../../envs"

# 1. Validate Environment
ENV=${1:-}
if [[ ! "$ENV" =~ ^(demo)$ ]]; then
    echo "❌ Error: Invalid or missing environment."
    echo "Usage: $0 {demo}"
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


# 3. Create Network if it doesn't exist
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    echo "🌐 Creating shared network: $DOCKER_NETWORK..."
    docker network create "$DOCKER_NETWORK"
else
    echo "🌐 Shared network $DOCKER_NETWORK already exists."
fi

# 4. Deploy the Stack
echo "🚀 Starting unilp-full-stack-$ENV..."
docker compose --env-file "$ENV_DIR/.env.$ENV" -f "$SCRIPT_DIR/unilp.docker-compose.$ENV.yml" up -d --build