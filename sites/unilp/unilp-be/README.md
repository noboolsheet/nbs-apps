# unilp-be

Backend del formulario de contacto de **unilp.it**. Recibe el `POST` del formulario
(`/contatti`), lo valida y reenvía el mensaje por email al buzón configurado, conectándose
como cliente al **servidor SMTP de Gmail** (con una app password).

- Stack: Express + Helmet + express-rate-limit + Zod + Nodemailer.
- Endpoint: `POST /contact` (en producción se accede como `https://unilp.it/api/contact`;
  Caddy enruta `/api/*` y quita el prefijo). Healthcheck: `GET /health`.
- Anti-spam: honeypot (`website`), rate-limit (5 / 10 min por IP), CORS allow-list, validación.

## Envío de email (Gmail SMTP)

Se envía con **Nodemailer** contra `smtp.gmail.com` usando una **App Password** de Google
(no la contraseña de la cuenta). Puerto **587** (STARTTLS). El remitente es siempre la cuenta
autenticada (`SMTP_USER`) —Gmail no permite enviar desde otra dirección— y el `Reply-To` es el
email del visitante.

> No se usan servicios de terceros, ni la Gmail API/OAuth2, ni un servidor de correo propio.
> Tampoco hace falta abrir puertos: el servidor (Hetzner) tiene la salida abierta, así que el
> contenedor puede conectar a `smtp.gmail.com:587` sin cambios de firewall.

### Generar la App Password

1. Cuenta de Google con verificación en 2 pasos activada.
2. https://myaccount.google.com/apppasswords → crear una → copiar los 16 caracteres.
3. Ponerla en `unilp-be/.env` como `SMTP_PASS`.

## Variables de entorno

Ver `.env.example`. El **secreto** (`SMTP_PASS`) va solo en `unilp-be/.env`, que está
gitignored y se inyecta al contenedor por `env_file`. El resto de config no secreta vive en
`../envs/.env.{dev,prod}`. (Nota: en este servidor unilp es una demo estatica y el
backend NO se despliega; este README queda como referencia.)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false          # 587 = STARTTLS; usar true solo si SMTP_PORT=465
SMTP_USER=demo@example.com
SMTP_PASS=<app-password>    # solo en unilp-be/.env
CONTACT_TO=demo@example.com
```

> En el servidor hay que **crear `unilp-be/.env` a mano** (no llega por git) antes
> del primer deploy, o `docker compose up` fallará por el `env_file` requerido.

## Comprobar la conexión SMTP

```bash
cd unilp-be
npm install
npm run smtp-check        # conecta y autentica contra Gmail (no envía email)
```

## Probar en local

```bash
# Backend (carga unilp-be/.env via dotenv)
cd unilp-be && npm run dev      # escucha en :3000

# Endpoint directo (envía un email real)
curl -X POST http://localhost:3000/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"a@b.com","message":"Mensaje de prueba largo","privacyConsent":true}'
# -> {"ok":true} y email recibido (revisar también spam)
```

### Formulario completo en local

`next dev` sirve el frontend en `:3000` pero **no** tiene la ruta `/api/contact` (el sitio es
export estático; esa ruta solo existe vía Caddy en el servidor). Para probar de punta a punta:

```bash
# Terminal A — backend en :3001 para no chocar con next dev
cd unilp-be && PORT=3001 npm run dev

# Terminal B — frontend apuntando al backend local
cd unilp-fe
# PowerShell:  $env:NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"; npm run dev
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 npm run dev
```

En producción no hace falta nada de esto: el front llama a `/api` en el mismo origen y Caddy
lo enruta al backend.

## Deploy

Desde `piserver_config/demos/unilp/`:

```bash
./deploy-unilp.sh nonprod   # o prod
```

Verificar con `docker logs unilp.be.<env>` que aparezca `emisor de email listo (smtp)`.
(Y `infrastructure/caddy/deploy.sh` si cambió el Caddyfile.)
