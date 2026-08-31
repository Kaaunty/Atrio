FROM node:20-alpine AS builder
WORKDIR /app

# Força instalação de devDependencies durante a compilação
ENV NODE_ENV=development

# Copia dependencias do workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --include=dev

# Copia o codigo fonte
COPY apps/web ./apps/web

# Executa o build via npm run build
RUN npm run build --workspace=apps/web

# Imagem de producao com Nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN printf 'server {\n    listen 80;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
