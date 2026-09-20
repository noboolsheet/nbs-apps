# Control Tower — imagen multi-stage para web y worker (ARM64/x64, doc 4 §28-29).
# Un mismo build produce ambos targets; el compose elige el comando (web vs worker).
# syntax=docker/dockerfile:1

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---- deps: instala dependencias del workspace con cache ----
# IMPORTANTE: copiar el package.json de TODOS los paquetes del workspace antes del install, o pnpm no
# enlaza los que falten y el build de Next no resuelve sus imports (p. ej. @ct/domain).
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY packages/application/package.json ./packages/application/
COPY packages/integrations/package.json ./packages/integrations/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- build: compila web (standalone) y paquetes ----
FROM deps AS build
COPY . .
RUN pnpm --filter @ct/web build

# ---- web runtime: Next.js standalone ----
FROM base AS web
ENV NODE_ENV=production
# Docker define HOSTNAME=<container-id> por defecto y el server standalone de Next se
# ata a esa IP (solo eth0). Forzamos 0.0.0.0 para que también escuche en loopback y el
# healthcheck (127.0.0.1) funcione.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ---- worker deps: SÓLO dependencias de producción del worker y su subárbol ----
# Antes el worker salía de la etapa `deps` con un `COPY . .`: se llevaba el workspace entero con TODAS las
# devDependencies (next, react, vitest, playwright, eslint, drizzle-kit…). Resultado: 1,35 GB de imagen —el
# triple que la web— y superficie de sobra justo en el servicio que habla con todas las APIs externas.
# `--filter @ct/worker...` instala el worker y sus dependencias del workspace; `--prod` deja fuera las de dev.
FROM base AS worker-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY packages/domain/package.json ./packages/domain/
COPY packages/db/package.json ./packages/db/
COPY packages/application/package.json ./packages/application/
COPY packages/integrations/package.json ./packages/integrations/
COPY apps/worker/package.json ./apps/worker/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@ct/worker..."

# ---- worker runtime: tsx sobre el código del worker ----
# El código sigue ejecutándose como TypeScript con `tsx` (los paquetes exportan `./src/index.ts`, sin paso de
# compilación: es la convención del repo y cambiarla afectaría también al `transpilePackages` de Next).
# Lo que se recorta aquí son las dependencias y los ficheros que no pinta nada llevar a producción.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=worker-deps /app ./
COPY packages ./packages
COPY apps/worker ./apps/worker
CMD ["pnpm", "--filter", "@ct/worker", "start"]
