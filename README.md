<h1 align="center">
  <img src="apps/web/public/logo-color.png" alt="Atrio" height="60" />
  <br/>
  Atrio — RH Digital
</h1>

<p align="center">
  Plataforma completa de Recursos Humanos, construida com foco em pessoas, processos e conformidade.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p>

---

## Sobre o Projeto

O **Atrio** e um sistema de RH digital modular e corporativo, projetado para centralizar e automatizar os processos de gestao de pessoas: ponto eletronico, ferias, solicitacoes, organograma, integracoes com controle de acesso e muito mais.

**Conceito visual:** O simbolo do Atrio representa uma pessoa no centro da organizacao — *pessoas no centro de tudo*.

---

## Arquitetura

O projeto e um **monorepo** com dois apps independentes:

```
Atrio/
├── apps/
│   ├── api/          # Backend — Node.js + Express + Prisma
│   └── web/          # Frontend — React + Vite + TailwindCSS
├── docker-compose.yml
└── package.json      # Workspace root (npm workspaces)
```

### Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, React Router v6, Axios, Lucide React |
| **Backend** | Node.js, Express 4, TypeScript, Zod |
| **ORM / DB** | Prisma 6 + PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | JWT + bcryptjs |
| **Infra** | Docker + Docker Compose |

---

## Funcionalidades Implementadas

| # | Modulo | Descricao |
|---|---|---|
| 00 | **Setup & Arquitetura** | Monorepo, configuracao da stack, estrutura base |
| 01 | **Estrutura Organizacional** | Empresas, departamentos, cargos e organograma |
| 02 | **Cadastro de Colaboradores** | CRUD completo com historico e timeline |
| 03 | **RBAC + Auditoria** | Controle de acesso por papeis e log de auditoria |
| 04 | **Integracao Control iD** | Integracao com dispositivos de ponto biometrico |
| 05 | **Meu Ponto & Banco de Horas** | Registro e consulta de ponto pelo colaborador |
| 06 | **Ajuste de Ponto & Divergencias** | Fluxo de ajuste aprovado por gestor/RH |
| 07 | **Engine de Workflow** | Motor de aprovacoes multi-etapa configuravel |
| 08 | **Gestao de Ferias** | Solicitacao, aprovacao e calendario de ferias |

## Roadmap (Em desenvolvimento)

| # | Modulo |
|---|---|
| 09 | Atestados & Afastamentos |
| 10 | Central de Documentos |
| 11 | Dashboards Operacionais |
| 12 | Relatorios & Notificacoes |
| 13 | Beneficios & Comunicados |
| 14 | Onboarding & Offboarding |
| 15 | Treinamentos, Feedback & PDI |

---

## Como Rodar Localmente

### Pre-requisitos

- [Node.js](https://nodejs.org/) `>= 20`
- [Docker](https://www.docker.com/) e Docker Compose

### 1. Clone o repositorio

```bash
git clone https://github.com/Kaaunty/Atrio.git
cd Atrio
```

### 2. Instale as dependencias

```bash
npm install
```

### 3. Configure as variaveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env`:

```env
PORT=3333
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/atrio_rh?schema=public"
JWT_SECRET="seu-segredo-jwt-aqui"
TIMEZONE="America/Sao_Paulo"
```

### 4. Suba o banco de dados

```bash
npm run db:up
```

### 5. Rode as migrations

```bash
npm run db:migrate
```

### 6. Inicie o projeto

```bash
# API + Web juntos
npm run dev

# Ou separadamente:
npm run dev:api   # http://localhost:3333
npm run dev:web   # http://localhost:5173
```

---

## Scripts Disponiveis

| Comando | Descricao |
|---|---|
| `npm run dev` | Inicia API e Web em paralelo |
| `npm run dev:api` | Inicia apenas a API |
| `npm run dev:web` | Inicia apenas o frontend |
| `npm run build` | Build de producao (todos os apps) |
| `npm run db:up` | Sobe PostgreSQL + Redis via Docker |
| `npm run db:down` | Para os containers |
| `npm run db:migrate` | Roda as migrations do Prisma |
| `npm run db:generate` | Gera o client Prisma |

---

## Design System

Documentado em [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), baseado em:

- **80% base neutra** — Superficies brancas, fundos `#F6F8FA`, bordas discretas
- **20% identidade** — Navy `#082E5C` (estrutura/confianca) + Teal `#0EAAA3` (pessoas/movimento)

| Variante do Logo | Uso |
|---|---|
| `logo-color.png` | Fundos claros, tela de login, padrao |
| `logo-white.png` | Sidebar e fundos escuros (Navy) |
| `logo-black.png` | Impressao, PDF, documentos monocromaticos |

---

## Estrutura de Pastas (API)

```
apps/api/src/
├── modules/
│   ├── auth/             # Autenticacao JWT
│   ├── employees/        # Colaboradores
│   ├── organization/     # Empresas, departamentos, cargos
│   ├── time-clock/       # Ponto, banco de horas, ajustes
│   ├── vacations/        # Gestao de ferias
│   ├── requests/         # Engine de workflow/solicitacoes
│   ├── integrations/     # Control iD
│   └── admin/            # RBAC + Auditoria
├── shared/               # Utilitarios, validacoes (CPF, CNPJ)
├── routes.ts             # Roteamento global
└── server.ts             # Entry point
```

---

## Licenca

Este projeto e privado e de uso proprietario. Todos os direitos reservados © Atrio RH Digital.
