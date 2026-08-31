# ETAPA 07 — Central de Solicitações e Engine de Workflow

> **Fase:** Workflows (Fase 3)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 11, 12, 32 e 33)

---

## 1. Objetivo
Implementar um **Mecanismo de Workflow Configurável e Reutilizável** e uma **Central Unificada de Solicitações**, permitindo que diferentes processos da empresa (alteração cadastral, declarações, dúvidas, horas extras, etc.) sigam esteiras parametrizadas de aprovação (`Etapa 1 → Etapa 2 → Conclusão`) sem necessidade de criar código duplicado para cada novo fluxo.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
RequestType (Tipos de Solicitação)
├── id: UUID (PK)
├── code: String (Unique, ex: "ALTERACAO_CADASTRAL", "DECLARACAO_VINCULO", "SOLICITACAO_GERAL")
├── name: String (Ex: "Declaração de Vínculo Empregatício")
├── description: String
├── category: String (Ex: "CADASTRO", "BENEFICIOS", "GERAL")
├── form_schema: JSONB (Definição dos campos dinâmicos do formulário: campos, tipos, obrigatoriedade)
├── allow_attachments: Boolean (Default: true)
├── active: Boolean (Default: true)
└── created_at, updated_at

RequestWorkflow (Configuração da Esteira de Aprovação)
├── id: UUID (PK)
├── request_type_id: UUID (FK -> RequestType.id)
├── name: String (Ex: "Fluxo Padrão: Gestor + RH")
├── active: Boolean (Default: true)
└── created_at, updated_at

RequestWorkflowStep (Etapas do Workflow)
├── id: UUID (PK)
├── workflow_id: UUID (FK -> RequestWorkflow.id)
├── step_order: Integer (1, 2, 3...)
├── name: String (Ex: "Aprovação do Gestor Imediato", "Validação do RH")
├── approver_type: Enum ('DIRECT_MANAGER', 'DEPARTMENT_HEAD', 'SPECIFIC_ROLE', 'SPECIFIC_USER')
├── required_role_id: UUID (FK -> Role.id, quando approver_type = 'SPECIFIC_ROLE')
├── timeout_days: Integer (Prazo para expiração/alerta SLA)
└── auto_action_on_timeout: Enum ('NONE', 'NOTIFY_ESCALATE', 'AUTO_APPROVE')

Request (Instância da Solicitação Aberta)
├── id: UUID (PK)
├── request_number: String (Unique, formato incremental anual: ex: "SOL-2026-00042")
├── request_type_id: UUID (FK -> RequestType.id)
├── workflow_id: UUID (FK -> RequestWorkflow.id)
├── requester_id: UUID (FK -> Employee.id, indexado)
├── current_step_order: Integer
├── current_assignee_id: UUID (FK -> User.id / Employee.id, responsável atual pela ação)
├── priority: Enum ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE')
├── status: Enum ('RASCUNHO', 'ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_GESTOR', 'AGUARDANDO_RH', 'APROVADO', 'REJEITADO', 'CONCLUIDO', 'CANCELADO')
├── title: String
├── description: Text
├── form_data: JSONB (Respostas preenchidas dos campos dinâmicos)
├── closed_at: Timestamp (nullable)
└── created_at, updated_at

RequestHistory (Linha do Tempo da Solicitação)
├── id: UUID (PK)
├── request_id: UUID (FK -> Request.id, indexado)
├── actor_id: UUID (FK -> User.id)
├── action: Enum ('CRIADA', 'AVANCADA', 'APROVADA', 'REJEITADA', 'DEVOLVIDA', 'COMENTADA', 'CANCELADA', 'CONCLUIDA')
├── from_status: String
├── to_status: String
├── step_name: String
├── comment: Text (Justificativa ou despacho)
└── created_at: Timestamp (Imutável)

RequestAttachment (Anexos da Solicitação)
├── id: UUID (PK)
├── request_id: UUID (FK -> Request.id, indexado)
├── file_name: String
├── file_url: String
├── file_size: Integer
├── mime_type: String
├── uploaded_by: UUID (FK -> User.id)
└── created_at: Timestamp
```

---

## 3. Máquina de Estados da Engine

```text
[ Rascunho ] ──> [ Aberto ] ──> [ Etapa 1: Gestor ] ──(Aprovado)──> [ Etapa 2: RH ] ──(Aprovado)──> [ Concluído ]
                       │                  │                               │
                       │             (Rejeitado)                     (Rejeitado)
                       │                  ▼                               ▼
                 (Cancelado)        [ Rejeitado ]                   [ Rejeitado ]
```

- **Resolução Automática do Aprovador**: Se a etapa for `DIRECT_MANAGER`, o sistema consulta o `manager_id` do solicitante em `Employee`. Se for `SPECIFIC_ROLE` (ex: `RH`), qualquer usuário com essa role pode assumir ou homologar a etapa.

---

## 4. Endpoints de API

### Catálogo de Solicitações
- `GET /api/v1/request-types` — Lista tipos disponíveis para o colaborador abrir
- `POST /api/v1/admin/request-types` — (Admin) Cria novo tipo de solicitação e configura formulário dinâmico

### Minhas Solicitações (Colaborador)
- `GET /api/v1/requests/me` — Lista solicitações abertas pelo usuário autenticado (com filtros de status)
- `POST /api/v1/requests` — Abre nova solicitação com validação do schema de campos dinâmicos e upload de anexos
- `GET /api/v1/requests/:id` — Detalhes da solicitação, campos preenchidos, histórico completo e anexos
- `POST /api/v1/requests/:id/cancel` — Cancela solicitação se ainda não tiver sido concluída

### Caixa de Entrada de Aprovações (Gestor / RH)
- `GET /api/v1/requests/inbox` — Lista solicitações que estão aguardando ação do usuário autenticado (por equipe ou papel)
- `POST /api/v1/requests/:id/approve` — Aprova etapa atual e avança para a próxima (ou conclui se for a última)
- `POST /api/v1/requests/:id/reject` — Rejeita solicitação com parecer obrigatório
- `POST /api/v1/requests/:id/comment` — Adiciona comentário interno no histórico sem alterar o status

---

## 5. Frontend & Interfaces

1. **Central de Solicitações (`/solicitacoes`)**:
   - Abas: *Minhas Solicitações* e *Aguardando Minha Aprovação* (com contador badge de pendências).
   - Botão de destaque: **"Nova Solicitação"**.
2. **Modal / Wizard de Abertura (`/solicitacoes/nova`)**:
   - Passo 1: Selecionar o tipo de solicitação (com ícone e descrição explicativa).
   - Passo 2: Renderização dinâmica dos campos requeridos (conforme `form_schema`).
   - Passo 3: Upload de documentos/comprovantes.
3. **Detalhes da Solicitação (`/solicitacoes/:id`)**:
   - Cabeçalho com Número, Solicitante, Status estilizado e Prioridade.
   - Stepper visual do Workflow (mostrando etapas concluídas, etapa atual e próximas).
   - Chat/Timeline de histórico com comentários dos avaliadores.
   - Painel lateral com ações de Aprovar / Rejeitar.

---

## 6. Critérios de Aceite

1. Novos tipos de solicitação e suas respectivas etapas podem ser criados via configuração sem mexer no código-fonte.
2. A engine resolve o aprovador correto (gestor direto ou grupo RH) no momento em que a solicitação é criada.
3. Cada transição de estado é auditada com registro de data, usuário e parecer.
4. Interface exibe claramente o progresso do workflow em formato de esteira visual.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/07-engine-workflow-solicitacoes.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
