# Atrio RH

Monorepo (npm workspaces): `apps/api` (backend) e `apps/web` (frontend).
Comandos na raiz: `npm run dev`, `npm run build`, `npm run db:migrate`, `npm run db:seed`, `npm run db:generate`.

## Banco de dados

- Postgres hospedado no Coolify (`192.168.50.150`), banco **`atrio_rh`**, porta publica `5432`.
  Outros bancos no mesmo servidor (`postgres`, `lumechat`, `lumechat_test`) nao pertencem a este projeto.
- Nao ha tunel SSH: o acesso SSH ao servidor so aceita chave e nao e necessario para o banco.
- Credenciais: pagina do banco no Coolify (General → Connection) ou API (`/api/v1/databases/<uuid>`, ver skill `coolify`). Nunca gravar senha em arquivos versionados nem imprimi-la.
- `.env` (raiz, ignorado pelo git): `DATABASE_URL` usa o hostname do container (`rylmxrhzh8dzmewvsuqkdq0l:5432/atrio_rh`), valido so dentro da rede `coolify` (deploy).
- `apps/api/.env`: para dev local fora do Docker, `DATABASE_URL` deve apontar para `192.168.50.150:5432/atrio_rh`.
- Cliente `psql` nao esta instalado; usar `docker run --rm -it --network host postgres:16-alpine psql -h 192.168.50.150 -U postgres -d atrio_rh`.

## Docker

- `docker-compose.yml`: producao/Coolify (api, web, redis; rede externa `coolify`).
- `docker-compose.local.yml`: override local (api em `network_mode: host`, `DATABASE_URL` montada a partir de `POSTGRES_*` do `.env` com host `DB_HOST` padrao `192.168.50.150`, banco `atrio_rh`).
  Subir: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`.
- Se o Coolify tiver `DATABASE_URL` nas variaveis do servico, ela deve terminar em `/atrio_rh`.
