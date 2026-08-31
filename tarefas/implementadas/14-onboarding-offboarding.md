# ETAPA 14 — Processos de Onboarding e Offboarding

> **Fase:** Módulos Complementares (Fase 6)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 21, 22, 32 e 33)

---

## 1. Objetivo
Automatizar a gestão de entrada (**Onboarding**) e saída (**Offboarding**) de colaboradores através de checklists estruturados de tarefas distribuídas entre **RH, TI, Gestor da Equipe e Facilities**, garantindo conformidade, prazos, entrega/devolução de equipamentos e bloqueio seguro de acessos.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
ChecklistTemplate (Modelos de Checklist)
├── id: UUID (PK)
├── name: String (Ex: "Onboarding Padrão - Geral", "Offboarding TI & Operações")
├── process_type: Enum ('ONBOARDING', 'OFFBOARDING')
├── department_id: UUID (FK -> Department.id, nullable para template padrão)
├── default_tasks: JSONB (Lista de tarefas padrão com responsável sugerido e prazo em dias)
├── active: Boolean (Default: true)
└── created_at, updated_at

LifecycleProcess (Processo de Integração ou Desligamento)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── process_type: Enum ('ONBOARDING', 'OFFBOARDING')
├── template_id: UUID (FK -> ChecklistTemplate.id)
├── status: Enum ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')
├── target_date: Date (Data de Admissão ou Data Prevista de Desligamento)
├── completed_at: Timestamp (nullable)
├── initiated_by: UUID (FK -> User.id)
└── created_at, updated_at

LifecycleTask (Tarefas Individuais do Processo)
├── id: UUID (PK)
├── process_id: UUID (FK -> LifecycleProcess.id, indexado)
├── title: String (Ex: "Criar e-mail corporativo", "Entregar notebook", "Cadastrar no ponto eletrônico")
├── description: Text
├── category: Enum ('RH', 'TI', 'GESTOR', 'FACILITIES', 'COLABORADOR')
├── assigned_user_id: UUID (FK -> User.id, responsável pela execução da tarefa)
├── due_date: Date
├── status: Enum ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'BLOQUEADA', 'CANCELADA')
├── completed_at: Timestamp
├── completed_by: UUID (FK -> User.id)
├── notes: Text
└── created_at, updated_at
```

---

## 3. Checklist Padrão Sugerido

### 🟢 Onboarding (Admissão)
1. **RH**: Enviar kit de documentos de admissão e coletar assinaturas.
2. **TI**: Criar usuário de rede, e-mail corporativo e acessos a sistemas internos.
3. **Facilities**: Providenciar crachá e acesso físico ao prédio.
4. **TI / Facilities**: Preparar e entregar computador/equipamentos de trabalho.
5. **RH**: Cadastrar biometria/matrícula no relógio de ponto Control iD.
6. **Gestor**: Apresentar time, definir mentor e realizar alinhamento de 1º dia.
7. **RH**: Agendar treinamento institucional inicial e apresentação de políticas.

### 🔴 Offboarding (Desligamento)
1. **RH**: Entrevista de desligamento (Exit Interview) e formalização de termos.
2. **TI**: Bloquear login em todos os sistemas corporativos e desativar e-mail no horário programado.
3. **Facilities**: Cancelar liberação do crachá e acesso físico.
4. **TI / Gestor**: Recolher computador, celular corporativo, periféricos e registrar termo de devolução.
5. **RH**: Inativar colaborador no sistema de ponto e arquivar documentação final.

---

## 4. Endpoints de API

### Processos & Tarefas
- `GET /api/v1/lifecycle-processes` — Lista processos em andamento com filtros (Onboarding/Offboarding, status)
- `POST /api/v1/lifecycle-processes` — Inicia novo processo de Onboarding/Offboarding a partir de um template
- `GET /api/v1/lifecycle-processes/:id` — Detalhes do processo e lista de tarefas com seus respectivos status
- `PATCH /api/v1/lifecycle-tasks/:id/complete` — Conclui tarefa com registro de observação e responsável
- `GET /api/v1/lifecycle-tasks/my-pending` — Lista tarefas atribuídas ao usuário logado (seja de TI, RH ou Gestor)

---

## 5. Frontend & Interfaces

1. **Painel de Onboarding & Offboarding (`/rh/processos`)**:
   - Visão Kanban ou Lista de processos ativos com barra percentual de progresso (ex: `7/10 tarefas concluídas`).
2. **Detalhes do Processo (`/rh/processos/:id`)**:
   - Agrupamento das tarefas por responsável / área (TI, RH, Gestor).
   - Checkbox rápido para marcar tarefas como concluídas com modal de detalhes.
3. **Widget "Minhas Tarefas de Processos"**:
   - Integrado ao dashboard de cada área (TI/Gestor/RH) para não deixar pendências esquecidas.

---

## 6. Critérios de Aceite

1. Ao admitir um novo colaborador, o sistema pode instanciar automaticamente o checklist de Onboarding com prazos relativos à data de admissão.
2. Tarefas atribuídas a TI ou Gestor aparecem em suas respectivas listas de pendências.
3. No Offboarding, a conclusão das tarefas de bloqueio e recolhimento de equipamentos é registrada com auditoria completa antes da inativação definitiva.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/14-onboarding-offboarding.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
