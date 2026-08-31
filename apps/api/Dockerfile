FROM node:20-alpine AS base
WORKDIR /app

# Instala dependencias
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=apps/api --ignore-scripts

# Copia o codigo
COPY apps/api ./apps/api

# Gera o Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build
RUN npm run build

# Imagem final enxuta
FROM node:20-alpine AS runner
WORKDIR /app/apps/api

COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/node_modules ./node_modules
COPY --from=base /app/apps/api/prisma ./prisma
COPY --from=base /app/apps/api/package.json ./package.json

EXPOSE 3333

CMD ["node", "dist/server.js"]
