# ETAPA 00 — Setup do Projeto, Stack e Arquitetura Base

> **Fase:** Fundação (Fase 1)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 32, 39 e 42)

---

## 1. Objetivo
Estabelecer a base técnica, infraestrutura de desenvolvimento, banco de dados relacional, arquitetura de pastas (backend e frontend), padrões de API, migrações versionadas e pipeline de qualidade de código.

---

## 2. Requisitos Técnicos e Diretrizes

1. **Stack Recomendada**:
   - **Frontend**: React + Vite com TypeScript, Tailwind CSS, Lucide Icons e React Router DOM.
   - **Backend**: Node.js com TypeScript (Express / Fastify), arquitetura limpa em camadas (Controllers, Services, Repositories).
   - **Banco de Dados**: PostgreSQL (com suporte a UUID, JSONB e índices de data/hora).
   - **ORM / Migrations**: Prisma ORM com migrações versionadas.
   - **Contêineres**: `docker-compose.yml` para PostgreSQL e Redis.
2. **Tratamento de Timezone & Timestamps**:
   - Todo timestamp persistido em banco em UTC (`TIMESTAMPTZ` ou `created_at`, `updated_at`, `deleted_at` para soft deletes).
   - Conversão e formatação com suporte explícito ao timezone da empresa (`America/Sao_Paulo`).
3. **Padrão de Respostas REST**:
   ```json
   {
     "success": true,
     "data": {},
     "meta": {
       "page": 1,
       "pageSize": 20,
       "total": 100
     }
   }
   ```
   Tratamento global de exceções (RFC 7807 Problem Details para erros).

---

## 3. Estrutura de Diretórios Recomendada

```text
├── apps/
│   ├── api/                     # Backend API
│   │   ├── src/
│   │   │   ├── modules/         # Módulos isolados por domínio (colaboradores, ponto, ferias, etc)
│   │   │   ├── shared/          # Middlewares, decorators, utils, database, auth
│   │   │   └── main.ts
│   │   ├── prisma/ ou migrations/
│   │   └── package.json
│   └── web/                     # Frontend App
│       ├── src/
│       │   ├── app/             # Rotas e páginas (Next.js App Router)
│       │   ├── components/      # UI components compartilhados
│       │   ├── hooks/           # Custom React hooks
│       │   └── lib/             # API client, formatadores, auth context
│       └── package.json
├── docker-compose.yml           # PostgreSQL, Redis (para filas/notificações)
└── README.md
```

---

## 4. Checklist de Implementação

- [ ] Definir a stack final e inicializar os repositórios/projetos (backend + frontend ou monorepo).
- [ ] Configurar `docker-compose.yml` contendo PostgreSQL 16+ e Redis.
- [ ] Configurar variáveis de ambiente (`.env.example` com `DATABASE_URL`, `JWT_SECRET`, `TIMEZONE`, etc.).
- [ ] Configurar ORM/Query Builder e pipeline de migrações automáticas.
- [ ] Implementar middleware global de tratamento de erros, validação de payload (ex: Zod / Class-Validator) e logging estruturado.
- [ ] Configurar CORS, Helmet, Rate Limiter e compressão.
- [ ] Configurar padronização de código: ESLint, Prettier, Husky (pre-commit) e TypeScript strict mode.
- [ ] Implementar endpoint de health check: `GET /api/health` retornando status do servidor e conexão com o banco.

---

## 5. Critérios de Aceite

1. `docker-compose up -d` sobe os serviços locais sem erros.
2. O backend inicializa, conecta ao PostgreSQL e executa migrações sem falhas.
3. O endpoint `GET /api/health` responde status `200 OK` com conectividade confirmada do banco de dados.
4. O frontend roda em ambiente de desenvolvimento (`localhost:3000`) com integração base pronta para consumir a API.

---

## 6. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/00-setup-stack-arquitetura.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
