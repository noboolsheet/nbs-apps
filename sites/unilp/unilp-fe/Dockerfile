# ---- Stage 1: Build Next.js (static export) ----
FROM node:22-alpine AS builder

WORKDIR /app

# Habilita el widget del chatbot n8n en el build. Las NEXT_PUBLIC_* se hornean
# en `next build`, asi que tiene que estar presente ANTES del build. Default
# 'false'; el compose de prod lo pone a 'true' (n8n solo existe en prod).
ARG NEXT_PUBLIC_CHAT_ENABLED=false
ENV NEXT_PUBLIC_CHAT_ENABLED=$NEXT_PUBLIC_CHAT_ENABLED

COPY . .
RUN npm install --force
RUN npm run build

# ---- Stage 2: Serve with nginx ----
FROM nginx:1.27-alpine AS runtime

# Remove the default static config so it doesn't interfere with our template
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/out /usr/share/nginx/html

# We don't COPY nginx.conf here because we use the 'volumes' in docker-compose
# to mount it to /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
