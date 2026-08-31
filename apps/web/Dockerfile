FROM node:20-slim AS builder
WORKDIR /app

# Copia manifestos de pacote do monorepo
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

# Instala dependencias resolvendo os pacotes nativos para Linux
RUN npm install --no-audit

# Copia codigo do frontend
COPY apps/web ./apps/web

# Compila o frontend usando o Vite do workspace
WORKDIR /app/apps/web
RUN npx vite build

# Servidor web leve com Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN printf 'server {\n    listen 80;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
