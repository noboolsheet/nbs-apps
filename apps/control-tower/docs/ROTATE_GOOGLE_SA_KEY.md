# Rotar la clave de la cuenta de servicio de Google (crítico #1 auditoría)

> **Por qué:** `ct-drive-integration.json` (clave privada de la service account de Google Drive) se **commiteó** al
> repositorio y está en el historial de git → **debe considerarse comprometida** y **rotarse**. Una vez una clave
> privada se filtra, purgar el historial NO basta: hay que **revocarla en Google** (lo primero) y crear una nueva.

**Clave filtrada (para que sepas cuál revocar):**
- Proyecto: `control-tower-integration`
- Service account: `control-tower-drive@control-tower-integration.iam.gserviceaccount.com`

La app **no** lee ese fichero: lee `GOOGLE_SA_KEY_B64` (el JSON en base64) desde `apps/control-tower/.env` (gitignored).
Así que rotar = revocar la vieja, crear una nueva y actualizar `GOOGLE_SA_KEY_B64`.

---

## Parte A — Revocar la clave filtrada (haz esto YA)

1. Google Cloud Console → **IAM y administración › Cuentas de servicio** → proyecto `control-tower-integration`.
2. Abre la SA `control-tower-drive@…` → pestaña **Claves (Keys)**.
3. Localiza la clave filtrada por su **ID** (el `private_key_id` del JSON) y pulsa **Eliminar** (o desactívala).
   Al borrarla, esa clave deja de funcionar en todas partes de inmediato. *(A partir de aquí el sync de Drive
   quedará caído hasta que instales la nueva clave — es lo esperado.)*

## Parte B — Crear una clave nueva

4. En la misma SA → **Claves › Agregar clave › Crear clave nueva › JSON** → se descarga un `.json`.
   Ese JSON **es el secreto**: no lo subas al repo, no lo pegues en chats ni en la DB.

## Parte C — Instalar el nuevo secreto correctamente

5. Pásalo a base64 en UNA sola línea (macOS):
   ```sh
   base64 -i /ruta/a/la-nueva-clave.json | tr -d '\n'
   ```
   (Linux/Pi: `base64 -w0 /ruta/a/la-nueva-clave.json`)
6. Pega el resultado en `apps/control-tower/.env` (gitignored) como **una sola línea**:
   ```
   GOOGLE_SA_KEY_B64=<pega-aquí-el-base64>
   ```
   ⚠️ **Gotcha real (F-21):** NO dupliques el nombre (`GOOGLE_SA_KEY_B64=GOOGLE_SA_KEY_B64=…`). Verifica que decodifica
   a JSON válido: `echo "$GOOGLE_SA_KEY_B64" | base64 -d | head -c 50` debe empezar por `{"type":"service_account"...`.
7. **En la Pi:** actualiza el mismo `GOOGLE_SA_KEY_B64` en el `.env` de la Pi y **recrea** el worker (un `restart` NO
   relee el `env_file`):
   ```sh
   docker compose up -d --force-recreate --no-deps worker
   ```
8. **Borra el JSON descargado** del disco (el secreto ya vive en `.env` y, si quieres copia, en tu gestor 1Password):
   ```sh
   rm /ruta/a/la-nueva-clave.json
   ```
9. **Verifica**: en la app → *Automatización › Integraciones › Google Drive › Sincronizar ahora* → debe quedar **ACTIVE**
   y traer ficheros. (Recuerda compartir la carpeta de Drive con el `client_email` de la **nueva** SA si es otra; si es
   la misma SA, la carpeta ya está compartida.)

## Parte D — Limpiar el repositorio (yo lo hago cuando me lo confirmes)

Esto no rota nada (eso es A–C); sólo evita que el fichero siga en el repo:
1. **Quitar el fichero y gitignorearlo** (seguro, no reescribe historia):
   ```sh
   git rm ct-drive-integration.json
   echo "ct-drive-integration.json" >> .gitignore
   # (+ patrón general, p. ej. *-integration.json, para que no se re-añada)
   ```
   commit + merge FF a prod, como el resto.
2. **Purgar del historial** (opcional pero recomendado; **reescribe la historia** y requiere `--force` a `prod`, que
   es rama remota → hay que coordinarlo):
   ```sh
   git filter-repo --path apps/control-tower/ct-drive-integration.json --invert-paths   # o BFG
   git push --force origin prod
   ```
   Como `prod` es tu única rama remota y la despliegas tú, el force-push es viable, pero **avísame** para hacerlo con
   cuidado (y re-sincronizar dev/control-tower-mvp locales).

---

## Higiene del secreto de aquí en adelante (regla dura #1 del proyecto)

- **Nunca** commitees claves/JSON de credenciales. En el repo sólo va un **puntero** (`credential_location`), jamás el secreto.
- El secreto real vive en **`.env` (gitignored)** + tu **gestor (1Password)**. `.env.*` ya está ignorado salvo `.env.example`.
- Añade el patrón del fichero a `.gitignore` para que no pueda re-colarse.
- Antes de cada commit, un vistazo: que no entre ningún `*.json` de service account ni claves.
