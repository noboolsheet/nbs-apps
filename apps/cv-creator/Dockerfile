# cv-creator: SPA de Vite + server Express (dist/server.cjs) que sirve el build,
# expone /api/parse-cv (Gemini) y ahora persiste usuarios/CVs en SQLite (/app/data).
#
# Base Debian (bookworm-slim, glibc) en lugar de alpine/musl: better-sqlite3 tiene
# prebuilds para glibc, así que se instala sin compilar (en alpine daría dolores).
#
# 3 etapas para NO recompilar el módulo nativo en runtime:
#   deps    → node_modules de producción (con las prebuilds nativas ya resueltas)
#   builder → node_modules completo + build (vite + esbuild → dist/)
#   runtime → copia dist/ + node_modules de `deps` (sin npm ci; runtime slim)

# ---- Stage 1: deps de producción ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 3: runtime ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Directorio de datos (SQLite). Se monta un volumen encima en compose para que
# el .db sobreviva a reinicios; aquí solo se asegura que exista.
RUN mkdir -p /app/data

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
