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

# Healthcheck usado pelo Coolify (rolling update espera o container ficar saudavel)
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENV NODE_ENV=production

# Aplica as migrations; o bootstrap da API provisiona o administrador configurado
# somente se ele ainda não existir no banco.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server.ts"]
