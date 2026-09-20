# nbs-apps — aplicaciones y webs propias

Todo lo que desarrollo que no es de un cliente concreto: mis productos con
backend y las webs de muestra que enseño en el portafolio y que sirven de punto
de partida cuando entra un cliente nuevo.

## Qué hay aquí

```
apps/     productos propios, con backend y datos
  control-tower/   capa de control del negocio (Next.js + worker + Postgres)
  cv-creator/      CV Express: creador de CVs con IA (React + Express + SQLite + Gemini)

sites/    webs de muestra, sin datos reales
  unilp/           sitio institucional — Next.js exportado estático → nginx
  utcs/            sitio institucional — SSR (TanStack Start)

envs/     configuración por perfil, en git, SIN secretos
```

No hay carpeta de plantillas: para un cliente nuevo se parte de la web de aquí o
de `clients/*/web` que más se parezca y se adapta.

## Los tres perfiles

Lo que separa "mi app privada" de "demo pública" **no es la carpeta, es el perfil
de despliegue**. El mismo código produce contenedores distintos:

| Perfil | Datos | Puerto atado a | Lo ve |
|--------|-------|----------------|-------|
| `dev` | ficticios | `127.0.0.1` | sólo el Mac |
| `prod` | **reales** | `0.0.0.0` → LAN de casa y tailnet | yo |
| `demo` | ficticios | `0.0.0.0`, y Caddy lo publica por su nombre de contenedor | cualquiera con el enlace |

vibox no tiene IP pública ni puertos abiertos, así que `0.0.0.0` significa "la LAN
de casa y el tailnet", no internet. Lo público sale por el túnel de Cloudflare
(ver `nbs-infra`), que sólo enruta contenedores del perfil `demo`.

| Proyecto | dev | prod | demo |
|----------|-----|------|------|
| control-tower | 4270 | 4272 | 4274 |
| cv-creator | 4240 | 4242 | 4244 |
| unilp | — | — | 4214 |
| utcs | — | — | 4224 |

`unilp` y `utcs` existen **sólo en perfil `demo`**: son muestras con datos ya
ficticios, no las uso yo ni pertenecen a ningún cliente.

## Secretos

**Un fichero por perfil**, todos gitignored, junto a cada proyecto:

```
apps/cv-creator/.env.dev      apps/cv-creator/.env.prod      apps/cv-creator/.env.demo
apps/control-tower/.env.dev   apps/control-tower/.env.prod   apps/control-tower/.env.demo
```

Cada `.env.example` explica cuáles hacen falta y **qué debe cambiar en `.env.demo`**.
Lo importante: la demo va abierta a internet, así que no lleva ninguna clave que
dé acceso a datos reales, y su clave de Gemini es distinta y con cuota baja.

## Desplegar

```sh
./apps/control-tower/deploy-control-tower.sh {dev|prod|demo}
./apps/cv-creator/deploy-cv-creator.sh       {dev|prod|demo}
./sites/unilp/deploy-unilp.sh                demo
./sites/utcs/deploy-utcs.sh                  demo
```

Cada script carga `envs/.env.<perfil>`, comprueba que existe el fichero de
secretos del perfil, crea la red `noboolsheet_network` si falta y levanta el stack.
En `prod` y `demo` también crea el directorio de datos.

Para publicar una demo hace falta además su bloque en `nbs-infra/caddy/CaddyFile`.

## Datos de las demos

`deploy-control-tower.sh demo` ejecuta el seed (`packages/db/src/seed.ts`) después
de migrar: **hace TRUNCATE de todas las tablas** y repuebla con una organización
ficticia determinista. Cada despliegue deja la demo en su estado canónico y borra
lo que hayan tocado los visitantes — que es lo que se quiere en una demo pública,
pero conviene saberlo.

Pendiente: el seed crea `owner@example.com` sin credencial en `accounts`, así que
todavía no hay con qué iniciar sesión. Ver la nota en `apps/control-tower/.env.example`.

## Desarrollo local de control-tower

Aparte del patrón de arriba, `control-tower` trae `compose.yml` +
`compose.override.yml` para iterar en local con hot-reload del worker
(`docker compose up`). Ver `apps/control-tower/CLAUDE.md`.
