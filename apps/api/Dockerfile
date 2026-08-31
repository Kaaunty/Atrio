FROM node:20-alpine AS builder
WORKDIR /app

# Copia estrutura de pacotes do monorepo
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Instala todas as dependencias
RUN npm ci

# Copia o codigo do backend
COPY apps/api ./apps/api

# Gera o Prisma Client e compila TypeScript
WORKDIR /app/apps/api
RUN npx prisma generate
RUN NODE_ENV=development npm run build

# Imagem final de producao
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 3333

CMD ["node", "dist/server.js"]
