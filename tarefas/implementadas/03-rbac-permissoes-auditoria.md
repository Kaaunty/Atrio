# ETAPA 03 — Controle de Acesso (RBAC), Escopos e Auditoria

> **Fase:** Fundação (Fase 1)  
> **Status:** Concluído  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 2, 27, 28 e 29)

---

## 1. Objetivo
Implementar o sistema de autenticação segura, autorização baseada em papéis e permissões granulares (**RBAC**) com **escopos contextuais** (próprio, equipe, setor, empresa, todos), além de um módulo centralizado de **Auditoria de Ações (`AuditLog`)** para conformidade e LGPD.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
User (Usuários do Sistema)
├── id: UUID (PK)
├── email: String (Unique)
├── password_hash: String
├── employee_id: UUID (FK -> Employee.id, nullable para admins puros)
├── active: Boolean (Default: true)
├── last_login_at: Timestamp
└── created_at, updated_at, deleted_at

Role (Perfis / Papéis)
├── id: UUID (PK)
├── name: String (Ex: "COLABORADOR", "GESTOR", "RH", "ADMIN")
├── description: String
├── is_system_default: Boolean (Perfis padrão não podem ser deletados)
└── created_at, updated_at

Permission (Permissões Granulares)
├── id: UUID (PK)
├── code: String (Unique, ex: "rh.colaboradores.visualizar", "rh.ponto.ajustar")
├── name: String
├── module: String (Ex: "COLABORADORES", "PONTO", "FERIAS", "SOLICITACOES", "DOCUMENTOS")
└── description: String

RolePermission (Tabela N:N com Escopo)
├── role_id: UUID (FK -> Role.id)
├── permission_id: UUID (FK -> Permission.id)
├── scope: Enum ('SELF', 'TEAM', 'DEPARTMENT', 'COMPANY', 'ALL')
└── PRIMARY KEY (role_id, permission_id)

UserRole (Tabela N:N)
├── user_id: UUID (FK -> User.id)
├── role_id: UUID (FK -> Role.id)
└── PRIMARY KEY (user_id, role_id)

AuditLog (Trilha de Auditoria Central)
├── id: UUID (PK)
├── user_id: UUID (FK -> User.id, nullable se for ação do sistema)
├── employee_id: UUID (FK -> Employee.id, opcional)
├── action: String (Ex: "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "DOWNLOAD")
├── entity: String (Ex: "Employee", "TimeClockAdjustment", "VacationRequest", "Document")
├── record_id: String (ID do registro afetado)
├── previous_value: JSONB (Payload antes da alteração)
├── new_value: JSONB (Payload após a alteração)
├── ip_address: String
├── user_agent: String
└── created_at: Timestamp (Imutável, indexado)
```

---

## 3. Matriz de Perfis e Escopos Iniciais

| Perfil | Escopo Padrão | Capacidades |
|---|---|---|
| **Colaborador** | `SELF` | Consultar próprios dados, ponto, férias, documentos, abrir solicitações e atestados. |
| **Gestor** | `TEAM` (e `SELF`) | Acessar dados da própria equipe liderada, aprovar ajustes de ponto, horas extras, férias e feedbacks. |
| **RH** | `COMPANY` ou `ALL` | Operação e gestão completa dos módulos de RH, aprovação final de workflows e relatórios. |
| **Administrador** | `ALL` | Configurações técnicas do sistema, permissões, usuários, auditoria e integrações. |

---

## 4. Endpoints de API

### Autenticação & Perfil Logado
- `POST /api/v1/auth/login` — Autenticação JWT com Refresh Token
- `POST /api/v1/auth/refresh-token` — Renovação de sessão
- `GET /api/v1/auth/me` — Retorna dados do usuário autenticado, colaborador vinculado, papéis e mapa de permissões com escopos

### Gestão de Perfis & Permissões (Admin)
- `GET /api/v1/admin/roles` — Lista perfis e permissões vinculadas
- `POST /api/v1/admin/roles` — Cria novo perfil
- `PUT /api/v1/admin/roles/:id` — Atualiza permissões e escopos do perfil
- `GET /api/v1/admin/permissions` — Lista catálogo de permissões disponíveis

### Auditoria (Admin / RH)
- `GET /api/v1/admin/audit-logs` — Consulta logs de auditoria com filtros avançados (usuário, entidade, ação, período, registro)

---

## 5. Middleware de Autorização e LGPD

1. **Guards/Middlewares no Backend**:
   - `RequirePermission('rh.colaboradores.visualizar')`
   - Resolução dinâmica do escopo: injetar cláusulas SQL/ORM `WHERE employee_id = req.user.employeeId` (se `SELF`) ou `WHERE manager_id = req.user.employeeId` ou subordinados recursivos (se `TEAM`).
2. **Auditoria Transparente**:
   - Interceptor / Middleware automático que intercepta mutations (`POST`, `PUT`, `PATCH`, `DELETE`) e grava no `AuditLog`.
3. **Proteção LGPD**:
   - Ocultação de dados sensíveis (dados médicos de atestados, CPFs e dados bancários) para usuários sem o escopo e permissão explícita de RH/Saúde Ocupacional.

---

## 6. Critérios de Aceite

1. Autenticação JWT funcionando com expiração e refresh token.
2. Um usuário com perfil `Colaborador` não consegue acessar dados ou bater endpoints de outro colaborador (resposta `403 Forbidden`).
3. Um gestor consegue listar apenas membros diretos e indiretos de sua equipe.
4. Toda alteração de dados cadastrais, aprovação ou exclusão gera registro correspondente em `AuditLog` com `previous_value` e `new_value`.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/03-rbac-permissoes-auditoria.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
