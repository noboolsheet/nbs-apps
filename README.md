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
| `prod` | **reales** | IP de Tailscale de vibox | yo, por el tailnet |
| `demo` | ficticios | `127.0.0.1`, y Caddy lo publica por su nombre de contenedor | cualquiera con el enlace |

| Proyecto | dev | prod | demo |
|----------|-----|------|------|
| control-tower | 4270 | 4272 | 4274 |
| cv-creator | 4240 | 4242 | 4244 |
| unilp | 4210 | — | 4214 |
| utcs | 4220 | — | 4224 |

`unilp` y `utcs` no tienen perfil `prod`: son muestras, nunca fueron producción.

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
./sites/unilp/deploy-unilp.sh                {dev|demo}
./sites/utcs/deploy-utcs.sh                  {dev|demo}
```

Cada script carga `envs/.env.<perfil>`, comprueba que existe el fichero de
secretos del perfil, crea la red `noboolsheet_network` si falta y levanta el stack.
En `prod` y `demo` también crea el directorio de datos.

> En `prod` el script **aborta** si `DOCKER_IFACE` sigue con `CAMBIAME`: hay que
> poner la IP de Tailscale de vibox (`tailscale ip -4`). Publicar en `0.0.0.0` una
> app con datos reales, en una máquina con IP pública, no es una opción.

Para publicar una demo hace falta además su bloque en `nbs-infra/caddy/CaddyFile`.

## Desarrollo local de control-tower

Aparte del patrón de arriba, `control-tower` trae `compose.yml` +
`compose.override.yml` para iterar en local con hot-reload del worker
(`docker compose up`). Ver `apps/control-tower/CLAUDE.md`.
