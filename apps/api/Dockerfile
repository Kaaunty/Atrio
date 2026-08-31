FROM node:20-alpine AS base
WORKDIR /app

# Força instalação de devDependencies durante a compilação
ENV NODE_ENV=development

# Copia dependencias do workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --include=dev

# Copia o codigo fonte
COPY apps/api ./apps/api

# Gera o Prisma Client e Build TypeScript
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Imagem de producao enxuta
FROM node:20-alpine AS runner
WORKDIR /app/apps/api

ENV NODE_ENV=production

COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/api/node_modules ./node_modules
COPY --from=base /app/apps/api/prisma ./prisma
COPY --from=base /app/apps/api/package.json ./package.json

EXPOSE 3333

CMD ["node", "dist/server.js"]
