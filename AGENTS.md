# Atrio RH

Instrucoes completas em [CLAUDE.md](CLAUDE.md). Resumo para agentes:

- Monorepo npm workspaces: `apps/api` e `apps/web`.
- Banco: Postgres no Coolify, `192.168.50.150:5432`, banco `atrio_rh`. Sem tunel SSH; o SSH ao servidor so aceita chave.
- Credenciais ficam no Coolify (pagina do banco ou API). Nunca gravar senha em arquivos versionados nem imprimi-la.
- Docker local: `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build`.
- Sem `psql` local; usar `docker run --rm -it --network host postgres:16-alpine psql -h 192.168.50.150 -U postgres -d atrio_rh`.
