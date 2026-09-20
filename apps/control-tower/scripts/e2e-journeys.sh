#!/bin/bash
# E2E de los journeys críticos del MVP (doc old_9 §25) vía HTTP contra la app real.
# Alternativa runnable a Playwright cuando no hay navegadores. Arranca el server standalone,
# provisiona usuario+org, ejecuta los 5 journeys + checks de hardening, y limpia.
set -u
FAIL=0
PORT=${PORT:-3211}
DB="postgres://control_tower:control_tower@localhost:5432/control_tower"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql_t() { docker exec control-tower-db-dev psql -U control_tower -d control_tower -tAc "$1" 2>/dev/null; }
check() { if [ "$1" = "$2" ]; then echo "  ✓ $3"; else echo "  ✗ $3 (esperado '$2', obtenido '$1')"; FAIL=1; fi; }

# Matar por PUERTO, no por línea de comandos: el server standalone de Next se renombra a
# "next-server (vX.Y.Z)" nada más arrancar, así que `pkill -f standalone/apps/web/server.js` NO lo
# encuentra. Consecuencia real: un server de una ejecución anterior seguía ocupando el puerto, el nuevo
# no llegaba a levantar y los curl hablaban con el VIEJO (sin las env de esta ejecución) → toda la suite
# fallaba en cascada con 307/308/401 y parecía una regresión de la app.
kill_port() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null; }
kill_port $PORT; sleep 1
# ALLOW_OPEN_REGISTRATION: el alta es BOOTSTRAP-ONLY (solo el primer usuario; seguridad, ver `lib/auth.ts`).
# Contra una BD de dev que ya tiene usuarios, el `sign-up` de abajo devolvía 403, el script se quedaba sin
# sesión y TODOS los journeys fallaban en cascada con 307/308/401 — parecía una regresión de la app y era el
# propio script. Es la vía de escape que el código ya documenta, y aquí es un servidor efímero de pruebas.
DATABASE_URL="$DB" BETTER_AUTH_SECRET='e2e-secret-0123456789abcdef0123456789' BETTER_AUTH_URL="http://127.0.0.1:$PORT" \
  ALLOW_OPEN_REGISTRATION=true \
  HOSTNAME=0.0.0.0 PORT=$PORT node "$DIR/apps/web/.next/standalone/apps/web/server.js" > /tmp/ct-journeys.log 2>&1 &
SRV=$!
for i in $(seq 1 20); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health" && break; sleep 1; done
B="http://127.0.0.1:$PORT"
JAR=/tmp/ct-journeys.txt; rm -f $JAR
EMAIL="journeys-$(date +%s)@example.com"
uuid() { grep -oE '"id":"[0-9a-f-]{36}"' | head -1 | grep -oE '[0-9a-f-]{36}'; }

# --- provisioning ---
USERID=$(curl -s -c $JAR -X POST "$B/api/auth/sign-up/email" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"supersecret123\",\"name\":\"J\"}" | uuid)
# El hook de registro auto-provisiona una org; para aislar el test la quitamos y creamos la nuestra.
psql_t "delete from organization_members where user_id='$USERID';" >/dev/null
ORGID=$(uuidgen | tr 'A-Z' 'a-z')
psql_t "insert into organizations (id,name,slug,status,created_at,updated_at) values ('$ORGID','J Org','j-$(date +%s)','ACTIVE',now(),now());" >/dev/null
psql_t "insert into organization_members (organization_id,user_id,role,created_at,updated_at) values ('$ORGID','$USERID','OWNER',now(),now());" >/dev/null
echo "provisioned user=$USERID org=$ORGID"

echo "J1: login → Home"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/")" "200" "GET / (Home) autenticado"
check "$(curl -s -b $JAR "$B/api/v1/context/home" | grep -oE '"snapshot"' | head -1)" '"snapshot"' "context/home devuelve snapshot"

echo "J2: Client → Project → Task → completar"
CLI=$(curl -s -b $JAR -X POST "$B/api/v1/clients" -H 'Content-Type: application/json' -d '{"name":"Cliente J"}'); CLIID=$(echo "$CLI" | uuid)
check "$([ -n "$CLIID" ] && echo ok)" "ok" "cliente creado"
PRJ=$(curl -s -b $JAR -X POST "$B/api/v1/projects" -H 'Content-Type: application/json' -d "{\"name\":\"Proyecto J\",\"clientId\":\"$CLIID\"}"); PRJID=$(echo "$PRJ" | uuid)
TASK=$(curl -s -b $JAR -X POST "$B/api/v1/projects/$PRJID/tasks" -H 'Content-Type: application/json' -d '{"title":"Tarea J"}'); TASKID=$(echo "$TASK" | uuid)
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/tasks/$TASKID/status" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
check "$(curl -s -b $JAR "$B/api/v1/projects" | grep -oE '"progress":[0-9]+' | head -1)" '"progress":100' "progreso derivado = 100 tras completar"

echo "J3: Capture → Review → Approve (knowledge)"
CAP=$(curl -s -b $JAR -X POST "$B/api/v1/knowledge-inbox" -H 'Content-Type: application/json' -d '{"rawContent":"idea J","sourceType":"MANUAL"}'); CAPID=$(echo "$CAP" | uuid)
ITEM=$(curl -s -b $JAR -X POST "$B/api/v1/knowledge-inbox/$CAPID/promote" -H 'Content-Type: application/json' -d '{"title":"Item J","knowledgeType":"NOTE"}'); ITEMID=$(echo "$ITEM" | uuid)
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/knowledge-items/$ITEMID/status" -H 'Content-Type: application/json' -d '{"status":"REVIEW"}'
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' -X PATCH "$B/api/v1/knowledge-items/$ITEMID/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}')" "200" "knowledge item DRAFT→REVIEW→APPROVED"

echo "J4: Decision Draft → Review → Approved"
DEC=$(curl -s -b $JAR -X POST "$B/api/v1/decisions" -H 'Content-Type: application/json' -d '{"title":"Decisión J","decision":"Hacer X"}'); DECID=$(echo "$DEC" | uuid)
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/decisions/$DECID/status" -H 'Content-Type: application/json' -d '{"status":"REVIEW"}'
check "$(curl -s -b $JAR -X PATCH "$B/api/v1/decisions/$DECID/status" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}' | grep -oE '"status":"APPROVED"')" '"status":"APPROVED"' "decisión aprobada"

echo "J5: Portfolio Item → Link Project"
PF=$(curl -s -b $JAR -X POST "$B/api/v1/portfolio-items" -H 'Content-Type: application/json' -d "{\"name\":\"Caso J\",\"type\":\"CaseStudy\",\"projectId\":\"$PRJID\"}")
check "$(echo "$PF" | grep -oE "\"projectId\":\"$PRJID\"")" "\"projectId\":\"$PRJID\"" "portfolio item enlazado al proyecto"

echo "J6: Detalle + edición inline (GET/PATCH por id)"
# Decision: editar context + rationale y verificar persistencia
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/decisions/$DECID" -H 'Content-Type: application/json' -d '{"context":"Surgió al planear","rationale":"Menor coste"}'
check "$(curl -s -b $JAR "$B/api/v1/decisions/$DECID" | grep -oE '"rationale":"Menor coste"')" '"rationale":"Menor coste"' "decisión: PATCH context/rationale persiste"
# Task: editar descripción + dueDate
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/tasks/$TASKID" -H 'Content-Type: application/json' -d '{"description":"detalle tarea","dueDate":"2026-12-31"}'
check "$(curl -s -b $JAR "$B/api/v1/tasks/$TASKID" | grep -oE '"description":"detalle tarea"')" '"description":"detalle tarea"' "tarea: PATCH descripción persiste"
# Contact: crear, abrir detalle, editar
CT=$(curl -s -b $JAR -X POST "$B/api/v1/contacts" -H 'Content-Type: application/json' -d "{\"firstName\":\"Ana\",\"clientId\":\"$CLIID\"}"); CTID=$(echo "$CT" | uuid)
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/contacts/$CTID" -H 'Content-Type: application/json' -d '{"jobTitle":"CTO","email":"ana@example.com"}'
check "$(curl -s -b $JAR "$B/api/v1/contacts/$CTID" | grep -oE '"jobTitle":"CTO"')" '"jobTitle":"CTO"' "contacto: PATCH jobTitle persiste"
# Capability: crear y editar madurez
CAPB=$(curl -s -b $JAR -X POST "$B/api/v1/capabilities" -H 'Content-Type: application/json' -d '{"name":"Cap J"}'); CAPBID=$(echo "$CAPB" | uuid)
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/capabilities/$CAPBID" -H 'Content-Type: application/json' -d '{"maturity":"ADVANCED","description":"desc cap"}'
check "$(curl -s -b $JAR "$B/api/v1/capabilities/$CAPBID" | grep -oE '"maturity":"ADVANCED"')" '"maturity":"ADVANCED"' "capability: PATCH maturity persiste"
# Aislamiento cross-org: GET con id inexistente → 404
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/api/v1/contacts/00000000-0000-0000-0000-000000000000")" "404" "detalle de id inexistente → 404"

echo "J7: Fuente de verdad visible (SourceBadge + identidad externa)"
# Las páginas con SourceBadge renderizan (200) para el usuario autenticado.
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/crm/clients")" "200" "GET /crm/clients (columna Fuente)"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/crm/clients/$CLIID")" "200" "GET detalle de cliente (Fuente + Open in CRM)"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/portfolio")" "200" "GET /portfolio (columna Fuente)"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/knowledge/library")" "200" "GET /knowledge/library (columna Fuente)"
# Cliente nativo (sin identidad externa) → el detalle indica que es nativo de Control Tower.
check "$(curl -s -b $JAR "$B/crm/clients/$CLIID" | grep -c 'nativo de Control Tower')" "1" "cliente sin identidad externa → 'nativo de Control Tower'"

echo "J8: Settings (organización editable + perfil)"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/settings")" "200" "GET /settings (página)"
check "$(curl -s -b $JAR "$B/api/v1/organization" | grep -oE '"slug":"j-[0-9]+"' | head -1 | grep -oE 'j-[0-9]+')" "$(psql_t "select slug from organizations where id='$ORGID';")" "GET organización (slug coincide)"
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/organization" -H 'Content-Type: application/json' -d '{"name":"J Org 2","timezone":"Europe/Madrid","defaultCurrency":"EUR"}'
check "$(curl -s -b $JAR "$B/api/v1/organization" | grep -oE '"timezone":"Europe/Madrid"')" '"timezone":"Europe/Madrid"' "PATCH organización: timezone persiste en settings"
check "$(psql_t "select name from organizations where id='$ORGID';")" "J Org 2" "PATCH organización: nombre persiste en DB"

echo "J9: Tareas (vencidas/hoy, reprogramar) + retención de completadas"
# Tarea vencida (2020) en el proyecto de J2.
OVER=$(curl -s -b $JAR -X POST "$B/api/v1/projects/$PRJID/tasks" -H 'Content-Type: application/json' -d '{"title":"Tarea vencida J","dueDate":"2020-01-01"}'); OVERID=$(echo "$OVER" | uuid)
check "$([ -n "$OVERID" ] && echo ok)" "ok" "tarea vencida creada"
# Home avisa de vencidas (no las lista, sólo el aviso con enlace a /tasks).
check "$(curl -s -b $JAR "$B/api/v1/context/home" | grep -oE '"kind":"tasks_overdue"' | head -1)" '"kind":"tasks_overdue"' "Home: aviso de tareas vencidas"
# Vista global de tareas renderiza y muestra el bucket "Vencidas".
check "$(curl -s -b $JAR "$B/tasks" | grep -c 'Vencidas')" "1" "GET /tasks muestra bucket Vencidas"
# Reprogramar la fecha de la vencida (reasignar fecha nueva).
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/tasks/$OVERID" -H 'Content-Type: application/json' -d '{"dueDate":"2027-01-01"}'
check "$(curl -s -b $JAR "$B/api/v1/tasks/$OVERID" | grep -oE '"dueDate":"2027-01-01"')" '"dueDate":"2027-01-01"' "reprogramar tarea vencida persiste"
# Retención: política 30 días + tarea DONE antigua (TASKID de J2, ya completada) → purga.
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/organization" -H 'Content-Type: application/json' -d '{"completedTaskRetentionDays":30}'
psql_t "update tasks set completed_at = now() - interval '60 days' where id='$TASKID';" >/dev/null
PURGE=$(curl -s -b $JAR -X POST "$B/api/v1/maintenance/purge-completed-tasks" -H 'Content-Type: application/json' -d '{}')
check "$(echo "$PURGE" | grep -oE '"deleted":1')" '"deleted":1' "purga: borra 1 tarea completada antigua"
check "$(psql_t "select count(*) from tasks where id='$TASKID';")" "0" "tarea completada eliminada de la tabla"
check "$(psql_t "select count(*) from audit_logs where organization_id='$ORGID' and entity_type='task' and action='DELETE';")" "1" "el borrado queda registrado en el audit log"

echo "J10: Business cross-refs (Área↔Goal) + Client→Projects inverso"
AR1=$(curl -s -b $JAR -X POST "$B/api/v1/strategic-areas" -H 'Content-Type: application/json' -d '{"name":"Área J"}'); AR1ID=$(echo "$AR1" | uuid)
AR2=$(curl -s -b $JAR -X POST "$B/api/v1/strategic-areas" -H 'Content-Type: application/json' -d '{"name":"Área J2"}'); AR2ID=$(echo "$AR2" | uuid)
GOAL=$(curl -s -b $JAR -X POST "$B/api/v1/goals" -H 'Content-Type: application/json' -d "{\"name\":\"Objetivo J\",\"strategicAreaId\":\"$AR1ID\"}"); GOALID=$(echo "$GOAL" | uuid)
check "$(curl -s -b $JAR "$B/api/v1/goals/$GOALID" | grep -oE "\"strategicAreaId\":\"$AR1ID\"")" "\"strategicAreaId\":\"$AR1ID\"" "goal creado con área (selector nombre→id)"
# Reasignar el goal a otra área desde el detalle (edición de relación por nombre).
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/goals/$GOALID" -H 'Content-Type: application/json' -d "{\"strategicAreaId\":\"$AR2ID\"}"
check "$(curl -s -b $JAR "$B/api/v1/goals/$GOALID" | grep -oE "\"strategicAreaId\":\"$AR2ID\"")" "\"strategicAreaId\":\"$AR2ID\"" "reasignar área del goal persiste"
# El detalle del área lista sus goals.
check "$(curl -s -b $JAR "$B/business/strategic-areas/$AR2ID" | grep -c 'Objetivo J')" "1" "detalle de Área lista su Goal"
# Cross-org: área de otra org → 404 (aislamiento).
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' -X PATCH "$B/api/v1/goals/$GOALID" -H 'Content-Type: application/json' -d '{"strategicAreaId":"00000000-0000-0000-0000-000000000000"}')" "404" "área inexistente → 404"
# Client → Projects inverso: el proyecto de J2 (cliente CLIID) aparece en la pestaña del cliente.
check "$(curl -s -b $JAR "$B/crm/clients/$CLIID" | grep -oE 'Proyectos \([0-9]+\)' | head -1)" "Proyectos (1)" "detalle de cliente cuenta sus proyectos"

echo "J11: Documents (lista solo-lectura + detalle → origen)"
DOC=$(curl -s -b $JAR -X POST "$B/api/v1/documents" -H 'Content-Type: application/json' -d '{"name":"Contrato J","externalProvider":"GDRIVE","externalUrl":"https://drive.google.com/file/xyz","status":"ACTIVE"}'); DOCID=$(echo "$DOC" | uuid)
check "$([ -n "$DOCID" ] && echo ok)" "ok" "documento (referencia) creado"
check "$(curl -s -b $JAR "$B/knowledge/documents" | grep -c 'Contrato J')" "1" "lista de Documents muestra el documento"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' "$B/knowledge/documents/$DOCID")" "200" "detalle de Document 200"
check "$(curl -s -b $JAR "$B/knowledge/documents/$DOCID" | grep -c 'Abrir en el origen')" "1" "detalle redirige al origen (Drive)"

echo "J12: Subtareas (CT, dentro de una tarea; fuera de la vista global)"
PT=$(curl -s -b $JAR -X POST "$B/api/v1/projects/$PRJID/tasks" -H 'Content-Type: application/json' -d '{"title":"Tarea con pasos"}'); PTID=$(echo "$PT" | uuid)
ST=$(curl -s -b $JAR -X POST "$B/api/v1/tasks/$PTID/subtasks" -H 'Content-Type: application/json' -d '{"title":"Paso uno"}'); STID=$(echo "$ST" | uuid)
check "$([ -n "$STID" ] && echo ok)" "ok" "subtarea creada"
check "$(curl -s -b $JAR "$B/api/v1/tasks/$STID" | grep -oE "\"parentTaskId\":\"$PTID\"")" "\"parentTaskId\":\"$PTID\"" "subtarea enlazada al padre"
check "$(curl -s -b $JAR "$B/tasks/$PTID" | grep -c 'Paso uno')" "1" "detalle del padre lista la subtarea"
check "$(curl -s -b $JAR "$B/tasks" | grep -c 'Paso uno')" "0" "vista global /tasks excluye subtareas"

echo "J13: Canales de captura del Inbox (webhook con token)"
CH=$(curl -s -b $JAR -X POST "$B/api/v1/inbox-channels" -H 'Content-Type: application/json' -d '{"name":"n8n test"}')
CHID=$(echo "$CH" | uuid); TOKEN=$(echo "$CH" | grep -oE '"token":"[^"]+"' | sed 's/"token":"//; s/"$//')
check "$([ -n "$CHID" ] && [ -n "$TOKEN" ] && echo ok)" "ok" "canal creado con token"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/inbox/webhook/$CHID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"content":"nota desde n8n"}')" "201" "webhook con token válido captura (201)"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/inbox/webhook/$CHID" -H "Authorization: Bearer malo" -H 'Content-Type: application/json' -d '{"content":"x"}')" "401" "webhook con token inválido → 401"
check "$(curl -s -b $JAR "$B/knowledge/inbox" | grep -c 'nota desde n8n')" "1" "la nota capturada aparece en el Inbox"
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/inbox-channels/$CHID" -H 'Content-Type: application/json' -d '{"status":"DISABLED"}'
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/inbox/webhook/$CHID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"content":"y"}')" "401" "canal desactivado → webhook 401"

echo "J14: Activos por cliente/proyecto (E-5, cliente derivado del proyecto)"
RC=$(curl -s -b $JAR -X POST "$B/api/v1/resources" -H 'Content-Type: application/json' -d "{\"name\":\"Cuenta Google\",\"type\":\"ACCESS\",\"clientId\":\"$CLIID\",\"credentialLocation\":\"1Password\"}"); RCID=$(echo "$RC" | uuid)
check "$([ -n "$RCID" ] && echo ok)" "ok" "activo personal del cliente creado"
RP=$(curl -s -b $JAR -X POST "$B/api/v1/resources" -H 'Content-Type: application/json' -d "{\"name\":\"App en Vercel\",\"type\":\"HOSTED_APP\",\"projectId\":\"$PRJID\",\"hosting\":\"THIRD_PARTY\"}"); RPID=$(echo "$RP" | uuid)
check "$(curl -s -b $JAR "$B/api/v1/resources/$RPID" | grep -oE "\"clientId\":\"$CLIID\"")" "\"clientId\":\"$CLIID\"" "activo de proyecto denormaliza el cliente"
check "$(curl -s -b $JAR "$B/crm/clients/$CLIID" | grep -oE 'Activos \([0-9]+\)' | head -1)" "Activos (2)" "cliente: 2 activos (personal + del proyecto)"
check "$(curl -s -b $JAR "$B/projects/$PRJID" | grep -oE 'Recursos \([0-9]+\)' | head -1)" "Recursos (1)" "proyecto: 1 recurso"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/resources" -H 'Content-Type: application/json' -d '{"name":"x","type":"OTHER"}')" "400" "activo sin cliente ni proyecto → 400"

echo "J15: Learning Path + sector de conocimiento"
LRN=$(curl -s -b $JAR -X POST "$B/api/v1/learning" -H 'Content-Type: application/json' -d '{"title":"Curso de Agentes","kind":"Curso","sector":"IA","url":"https://example.com/curso","progress":10}'); LRNID=$(echo "$LRN" | uuid)
check "$([ -n "$LRNID" ] && echo ok)" "ok" "learning item creado"
check "$(curl -s -b $JAR "$B/api/v1/learning/$LRNID" | grep -oE '"sector":"IA"')" '"sector":"IA"' "learning item guarda el sector"
curl -s -b $JAR -o /dev/null -X PATCH "$B/api/v1/learning/$LRNID" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS","progress":50}'
check "$(curl -s -b $JAR "$B/api/v1/learning/$LRNID" | grep -oE '"progress":50')" '"progress":50' "learning item: PATCH progreso persiste"
check "$(curl -s -b $JAR "$B/knowledge/learning" | grep -oE 'Curso de Agentes' | head -1)" "Curso de Agentes" "learning aparece en la vista /knowledge/learning"
# Sector en la Knowledge Library (vía promote con sector)
SCAP=$(curl -s -b $JAR -X POST "$B/api/v1/knowledge-inbox" -H 'Content-Type: application/json' -d '{"rawContent":"nota IA","sourceType":"MANUAL"}'); SCAPID=$(echo "$SCAP" | uuid)
SITEM=$(curl -s -b $JAR -X POST "$B/api/v1/knowledge-inbox/$SCAPID/promote" -H 'Content-Type: application/json' -d '{"title":"Nota con sector","knowledgeType":"NOTE","sector":"IA"}'); SITEMID=$(echo "$SITEM" | uuid)
check "$(curl -s -b $JAR "$B/api/v1/knowledge-items/$SITEMID" | grep -oE '"sector":"IA"')" '"sector":"IA"' "knowledge item promovido guarda el sector"

echo "Hardening:"
check "$(curl -s -b $JAR -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/clients" -H 'Origin: http://evil.example' -H 'Content-Type: application/json' -d '{"name":"x"}')" "403" "CSRF: Origin ajeno rechazado (403)"
check "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/v1/clients" -H 'Content-Type: application/json' -d '{"name":"x"}')" "401" "sin sesión → 401"
check "$(curl -s -D - -o /dev/null "$B/" | grep -qi 'x-content-type-options: nosniff' && echo present)" "present" "cabecera de seguridad presente"

# --- cleanup ---
for t in learning_items resources inbox_channels audit_logs change_events outbox_events portfolio_items tasks deliverables decisions documents knowledge_items knowledge_inbox external_identities integrations jobs projects contacts opportunities clients capabilities goals strategic_areas; do
  psql_t "delete from $t where organization_id='$ORGID';" >/dev/null
done
psql_t "delete from organization_members where organization_id='$ORGID'; delete from sessions where user_id='$USERID'; delete from accounts where user_id='$USERID'; delete from users where id='$USERID'; delete from organizations where id='$ORGID';" >/dev/null
kill $SRV 2>/dev/null; kill_port $PORT
echo "-----"
if [ "$FAIL" = "0" ]; then echo "TODOS LOS JOURNEYS OK ✅"; else echo "HAY FALLOS ❌"; exit 1; fi
