# ETAPA 15 — Treinamentos, Feedbacks (1:1) e Plano de Desenvolvimento Individual (PDI)

> **Fase:** Evolução e Desenvolvimento (Fase 6)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 17, 18, 19, 20, 32 e 33)

---

## 1. Objetivo
Implementar os módulos voltados ao desenvolvimento contínuo e gestão de pessoas:
1. **Treinamentos**: Catálogo de cursos obrigatórios e eletivos, acompanhamento de conclusões, validade e certificados.
2. **Feedbacks & Reuniões 1:1**: Registro seguro e estruturado de conversas de feedback entre gestores e liderados.
3. **PDI (Plano de Desenvolvimento Individual)**: Metas, competências a desenvolver, planos de ação e acompanhamento de evidências.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
Training (Catálogo de Treinamentos)
├── id: UUID (PK)
├── title: String (Ex: "Segurança da Informação e LGPD", "Integração Institucional", "CIPA")
├── description: Text
├── category: Enum ('OBRIGATORIO_LEGAL', 'INSTITUCIONAL', 'TECNICO', 'LIDERANCA', 'OPCIONAL')
├── validity_months: Integer (Validade do treinamento em meses; ex: 12 meses para renovação)
├── workload_hours: Integer (Carga horária)
├── provider: String (Instrutor interno ou plataforma parceira)
├── active: Boolean (Default: true)
└── created_at, updated_at

EmployeeTraining (Participação / Matrícula em Treinamento)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── training_id: UUID (FK -> Training.id)
├── status: Enum ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'VENCIDO')
├── started_at: Date
├── completed_at: Date
├── expires_at: Date (Data limite de renovação calculada: completed_at + validity_months)
├── certificate_url: String (Comprovante / certificado PDF)
└── created_at, updated_at

Feedback (Registro de Feedbacks e 1:1s)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado - Colaborador que recebeu)
├── author_id: UUID (FK -> User.id / Employee.id - Gestor/Avaliador)
├── feedback_type: Enum ('POSITIVO', 'DESENVOLVIMENTO', 'REUNIAO_1ON1', 'ALINHAMENTO')
├── subject: String (Assunto da conversa)
├── content: Text (Pontos discutidos e destaques)
├── action_items: JSONB (Acordos e ações combinadas: [{ task, deadline, completed }])
├── visibility: Enum ('PRIVATE_MANAGER_EMPLOYEE', 'MANAGER_ONLY', 'RH_ACCESSIBLE')
├── feedback_date: Date
└── created_at, updated_at

DevelopmentPlan (PDI - Plano de Desenvolvimento Individual)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── mentor_id: UUID (FK -> Employee.id, Gestor ou Mentor de carreira)
├── title: String (Ex: "PDI 2026 - Transição para Sênior")
├── period_year: Integer (Ex: 2026)
├── status: Enum ('RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')
└── created_at, updated_at

DevelopmentPlanGoal (Objetivos e Ações do PDI)
├── id: UUID (PK)
├── development_plan_id: UUID (FK -> DevelopmentPlan.id, indexado)
├── title: String (Ex: "Dominar Arquitetura Limpa e Microserviços")
├── competency: String (Ex: "Conhecimento Técnico Avançado")
├── target_date: Date
├── status: Enum ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')
├── action_steps: Text (Ações práticas a serem executadas)
├── evidence_notes: Text (Evidências de conclusão / links / projetos entregues)
└── created_at, updated_at
```

---

## 3. Endpoints de API

### Treinamentos
- `GET /api/v1/trainings/me` — Lista treinamentos atribuídos ao colaborador com status e prazos de validade
- `POST /api/v1/trainings/:id/certificate` — Upload de certificado pelo colaborador
- `GET /api/v1/rh/trainings/compliance` — (RH) Relatório de conformidade de treinamentos obrigatórios por setor

### Feedbacks & 1:1
- `GET /api/v1/feedbacks/me` — Histórico de feedbacks recebidos pelo colaborador logado
- `GET /api/v1/feedbacks/team/:employeeId` — Histórico de feedbacks registrados pelo gestor para seu liderado
- `POST /api/v1/feedbacks` — Cria novo registro de feedback / 1:1 com acordos combinados

### PDI (Plano de Desenvolvimento Individual)
- `GET /api/v1/development-plans/me` — Retorna o PDI ativo e histórico de metas do colaborador
- `POST /api/v1/development-plans` — Cria novo PDI (Colaborador ou Gestor)
- `POST /api/v1/development-plans/:id/goals` — Adiciona meta com competência e prazo
- `PATCH /api/v1/development-plans/goals/:goalId` — Atualiza progresso e anexa evidências

---

## 4. Frontend & Interfaces

1. **Minha Trilha de Aprendizado (`/desenvolvimento/treinamentos`)**:
   - Cards dos treinamentos com prazos, status e botão para upload de certificado.
2. **Espaço 1:1 e Feedbacks (`/desenvolvimento/feedbacks` e visão de equipe `/gestao/equipe/feedbacks`)**:
   - Timeline das conversas passadas, plano de ação e campo para registrar novas sessões.
3. **Gestão do PDI (`/desenvolvimento/pdi`)**:
   - Visualização estilo roadmap das competências e metas de carreira, com checkboxes para cada ação combinada.

---

## 5. Critérios de Aceite

1. Treinamentos com prazo de validade alertam o colaborador e o RH antes do vencimento.
2. Regras de visibilidade de feedbacks garantem que outro membro da equipe não veja anotações confidenciais entre gestor e liderado.
3. Colaborador e gestor conseguem atualizar metas do PDI e registrar evidências comprovadas de evolução.

---

## 6. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/15-treinamentos-feedback-pdi.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
