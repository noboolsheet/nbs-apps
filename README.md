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

El acceso a la demo sale de `SEED_DEMO_PASSWORD`, en `apps/control-tower/.env.demo`:
con ella el seed crea la credencial de `owner@example.com` usando la misma función
de hash que Better Auth. Es obligatoria en el perfil `demo` — sin ella nadie podría
entrar, porque el registro es bootstrap-only y el usuario sembrado ya ocupa ese
hueco. En `dev` y `prod` no se define: allí el seed no crea credenciales, como antes.

Esa contraseña es pública de facto (la enseñas a quien vea la demo): no la
reutilices en ningún otro sitio.

La demo de **cv-creator** va al revés: el registro está **abierto**, porque todos
sus endpoints exigen sesión y con el registro cerrado un visitante sólo vería la
pantalla de login. A cambio acumula cuentas y CVs de desconocidos, con datos
personales dentro, así que hay que vaciarla cada cierto tiempo:

```sh
./apps/cv-creator/reset-demo.sh          # pide confirmación
./apps/cv-creator/reset-demo.sh --si     # sin preguntar
```

Sólo toca el directorio de datos del perfil demo; el de prod es otro y se niega a
ejecutarse si la ruta no lleva «demo».

### Dejarlo semanal

```sh
sudo cp apps/cv-creator/systemd/nbs-cv-creator-reset.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nbs-cv-creator-reset.timer
```

Domingos a las 4:00, con `Persistent=true` para que una semana con la máquina
apagada no se salte el vaciado. Comprobar:

```sh
systemctl list-timers nbs-cv-creator-reset.timer   # cuándo toca
systemctl start nbs-cv-creator-reset.service       # ejecutarlo YA, para probar
journalctl -u nbs-cv-creator-reset -n 30           # cómo fue
```

> Antes de dejarlo automático, córrelo una vez a mano y comprueba que la demo
> vuelve a levantar y deja registrarse. Un vaciado que rompe la demo cada domingo
> de madrugada es peor que no vaciarla.

La unidad corre como `root` porque el directorio es un bind-mount que escribe el
contenedor; el script detecta que ya es root y no invoca `sudo`. Ajusta la ruta
del `ExecStart` si clonaste los repos fuera de `/home/vibox`.

## Desarrollo local de control-tower

Aparte del patrón de arriba, `control-tower` trae `compose.yml` +
`compose.override.yml` para iterar en local con hot-reload del worker
(`docker compose up`). Ver `apps/control-tower/CLAUDE.md`.
