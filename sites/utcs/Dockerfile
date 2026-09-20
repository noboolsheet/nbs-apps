# ---- Stage 1: Build TanStack Start (SSR, Nitro node-server) ----
# El template de Lovable trae como target por defecto Cloudflare Workers. Para
# correr en Docker forzamos a Nitro a emitir un servidor Node autonomo via la
# variable NITRO_PRESET (.output/server/index.mjs).
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Capa cacheable de dependencias.
# NOTA: bun.lock esta DESINCRONIZADO con package.json (bun install --frozen-lockfile
# falla con "lockfile had changes"). Por eso usamos install no-congelado: bun
# re-resuelve y actualiza el lockfile en el contenedor. Para builds reproducibles,
# regenerar bun.lock localmente (`bun install`) y commitearlo; luego se puede
# volver a `--frozen-lockfile`.
COPY package.json bun.lock bunfig.toml ./
RUN bun install

COPY . .

# Belt-and-suspenders: el preset tambien se fija en vite.config.ts (nitro.preset).
ENV NITRO_PRESET=node-server
ENV SERVER_PRESET=node-server

# Gate del chatbot: las vars VITE_* se hornean en el build. Default false; el
# compose de prod lo pone a "true" (n8n solo existe en prod). Cuando es false el
# widget no se renderiza (__root.tsx).
ARG VITE_CHAT_ENABLED=false
ENV VITE_CHAT_ENABLED=$VITE_CHAT_ENABLED

RUN bun run build

# ---- Stage 2: Runtime (Node) ----
# Nitro empaqueta sus dependencias dentro de .output, asi que el runtime solo
# necesita esa carpeta. El contenedor escucha en :80 (Caddy lo alcanza por
# nombre en shared_network a ese puerto).
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80
ENV HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 80
CMD ["node", ".output/server/index.mjs"]
