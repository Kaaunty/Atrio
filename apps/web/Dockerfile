FROM node:20-alpine AS builder
WORKDIR /app

# Copia estrutura de pacotes do monorepo
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Instala todas as dependencias
RUN npm ci

# Copia o codigo do frontend
COPY apps/web ./apps/web

# Executa o build dentro de apps/web
WORKDIR /app/apps/web
RUN NODE_ENV=development npm run build

# Servidor web leve com Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN printf 'server {\n    listen 80;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
