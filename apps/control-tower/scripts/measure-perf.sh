#!/bin/bash
# Mide el rendimiento REAL de Control Tower donde importa: en la Pi (E-14).
#
# Por qué existe: el owner reporta «varios segundos por página». Medido en el portátil, las mismas páginas
# tardan 12–27 ms, así que el número de consultas no lo explica — hay que medir en el hardware real antes de
# optimizar nada. Este script da los dos números que hacen falta:
#
#   1. TIEMPO DE PARED por página (lo que sufres), con el servidor ya caliente.
#   2. REPARTO db / resto en las rutas de API, leído de la cabecera `Server-Timing` que emite `withContext`.
#      Ojo: `db` es la SUMA de la latencia de las consultas (emisión → resultado, incluida la espera por una
#      conexión libre), no tiempo de pared. Si hay paralelismo puede superar a `total`, y eso es buena señal.
#
# Cómo leerlo:
#   - páginas lentas + `db` alto            → es la base de datos (consultas o índices)
#   - páginas lentas + `db` bajo            → NO es la base de datos: render, Node, E/S o memoria (mira `free -h`
#                                             y `docker stats`; sin límites de memoria la Pi puede estar en swap)
#   - la 1ª pasada lenta y la 2ª rápida     → arranque en frío, no un problema de estado estacionario
#
# Uso:
#   CT_EMAIL=tu@correo CT_PASSWORD=tuclave ./scripts/measure-perf.sh [URL_BASE] [REPETICIONES]
#   (por defecto: http://localhost:4272 y 3 repeticiones)
#
# Consulta las lentas a la vez, en otra terminal:
#   docker logs -f control-tower-app.prod 2>&1 | grep 'consulta lenta'
set -u

BASE="${1:-http://localhost:4272}"
REPS="${2:-3}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

if [ -z "${CT_EMAIL:-}" ] || [ -z "${CT_PASSWORD:-}" ]; then
  echo "❌ Faltan credenciales. Uso: CT_EMAIL=... CT_PASSWORD=... $0 [URL_BASE] [REPETICIONES]"
  exit 1
fi

echo "📍 $BASE · $REPS repeticiones por ruta"

code=$(curl -s -c "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$CT_EMAIL\",\"password\":\"$CT_PASSWORD\"}")
if [ "$code" != "200" ]; then
  echo "❌ No se pudo iniciar sesión (HTTP $code). Revisa CT_EMAIL / CT_PASSWORD."
  exit 1
fi
echo "🔑 sesión iniciada"

PAGES="/ /projects /tasks /crm/clients /crm/opportunities /knowledge/library /knowledge/review /payments /portfolio /automation/health /settings"

printf '\n%-26s %8s %8s %8s\n' "RUTA" "1ª (frío)" "mejor" "media"
printf '%s\n' "------------------------------------------------------------"
for p in $PAGES; do
  first=$(curl -s -b "$JAR" -o /dev/null -w '%{time_total}' "$BASE$p")
  best=""; sum=0
  for _ in $(seq 1 "$REPS"); do
    t=$(curl -s -b "$JAR" -o /dev/null -w '%{time_total}' "$BASE$p")
    sum=$(echo "$sum + $t" | bc -l)
    if [ -z "$best" ] || [ "$(echo "$t < $best" | bc -l)" = "1" ]; then best=$t; fi
  done
  avg=$(echo "$sum / $REPS" | bc -l)
  printf '%-26s %7.0fms %7.0fms %7.0fms\n' "$p" \
    "$(echo "$first * 1000" | bc -l)" "$(echo "$best * 1000" | bc -l)" "$(echo "$avg * 1000" | bc -l)"
done

echo
echo "REPARTO db / resto (cabecera Server-Timing de las rutas de API):"
printf '%s\n' "------------------------------------------------------------"
for a in /api/v1/context/home /api/v1/projects /api/v1/clients /api/v1/decisions '/api/v1/search?q=a'; do
  curl -s -b "$JAR" -o /dev/null "$BASE$a"   # calentar
  st=$(curl -s -b "$JAR" -o /dev/null -D - "$BASE$a" | tr -d '\r' | grep -i '^server-timing:' | cut -d' ' -f2-)
  printf '  %-28s %s\n' "${a%%\?*}" "${st:-(sin cabecera)}"
done

echo
echo "💡 db;dur = SUMA de la latencia de las consultas (emisión → resultado, con la espera de conexión dentro)."
echo "   No es tiempo de pared: con consultas paralelas puede superar a total;dur, y eso es buena señal."
echo "   total;dur = la petición completa en el servidor."
echo "   Lo que buscamos: si las páginas van lentas y db;dur es BAJO, el problema NO está en las consultas."
