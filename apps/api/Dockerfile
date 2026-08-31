FROM node:20-slim
WORKDIR /app

# Dependencias do sistema para OpenSSL
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copia manifestos de pacotes
COPY package.json ./
COPY package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Instala dependencias para producao
RUN npm ci --no-audit

# Copia codigo do backend
COPY apps/api ./apps/api

# Gera o Prisma Client
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3333

ENV NODE_ENV=production

CMD ["npx", "tsx", "src/server.ts"]
