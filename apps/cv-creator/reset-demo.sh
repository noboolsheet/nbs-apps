#!/bin/bash
# reset-demo.sh — vacía los datos de la demo pública de cv-creator.
#
# La demo tiene el registro ABIERTO: sin cuenta no se puede probar nada, porque
# todos los endpoints útiles exigen sesión. El precio es que acumula cuentas y
# CVs de desconocidos, con datos personales reales dentro (nombres, teléfonos,
# historial laboral). Guardarlos indefinidamente en una demo no tiene ninguna
# justificación, así que se vacían cada cierto tiempo.
#
# Sólo toca el perfil DEMO. Los datos de prod viven en otro directorio
# (CV_CREATOR_DATA_DIR es distinto en .env.prod y .env.demo) y no se tocan.
#
# Uso:  ./reset-demo.sh          # pide confirmación
#       ./reset-demo.sh --si     # sin preguntar (para el temporizador)
#
# Semanal con cron: ver ./cron/nbs-cv-creator-reset y el README de nbs-apps.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/../../envs"

# A mano se corre como tu usuario y hace falta sudo para borrar el bind-mount;
# desde cron ya se corre como root y sudo sobraría (y donde no esté instalado,
# fallaría).
SUDO=""; [[ $EUID -ne 0 ]] && SUDO="sudo"

set -a; source "$ENV_DIR/.env.demo"; set +a
CONTENEDOR="${DOCKER_CV_CREATOR_APP_DDNS}.demo"
DATOS="${CV_CREATOR_DATA_DIR:?falta CV_CREATOR_DATA_DIR en envs/.env.demo}"

# Salvaguarda: si por un error de configuración esto apuntara al directorio de
# prod, borraría los CVs reales. Se comprueba que la ruta sea la de la demo.
if [[ "$DATOS" != *demo* ]]; then
    echo "❌ CV_CREATOR_DATA_DIR ('$DATOS') no parece el de la demo."
    echo "   Abortado: el de prod tiene CVs de usuarios reales."
    exit 1
fi

if [[ "${1:-}" != "--si" ]]; then
    echo "Se van a BORRAR todas las cuentas y CVs de la demo en: $DATOS"
    read -rp "¿Seguir? [s/N] " r
    [[ "$r" == "s" || "$r" == "S" ]] || { echo "Cancelado."; exit 0; }
fi

echo "⏸  Parando $CONTENEDOR…"
docker stop "$CONTENEDOR" >/dev/null 2>&1 || true

echo "🗑  Vaciando $DATOS…"
# Se borra el CONTENIDO, no el directorio: es un bind-mount y recrearlo puede
# dejarlo con otro propietario y el contenedor sin poder escribir.
$SUDO find "$DATOS" -mindepth 1 -delete

echo "▶️  Arrancando de nuevo…"
docker start "$CONTENEDOR" >/dev/null

echo "✅ Demo de cv-creator vacía. La app recrea la BD al primer arranque."
