FROM node:22-alpine

WORKDIR /app

# Instalar solo dependencias de produccion (capa cacheable).
COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
