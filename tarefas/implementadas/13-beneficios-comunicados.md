# ETAPA 13 — Gestão de Benefícios e Comunicados Internos

> **Fase:** Módulos Complementares (Fase 6)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 15, 16, 32 e 33)

---

## 1. Objetivo
Implementar:
1. **Gestão de Benefícios**: Catálogo de benefícios da empresa (VR, VA, VT, Plano de Saúde, Odonto, Auxílios, Convênios), controle de adesão por colaborador, dependentes elegíveis e vigência.
2. **Mural de Comunicados Internos**: Publicação de notícias, avisos institucionais e campanhas de RH com segmentação por público-alvo, agendamento de postagem e confirmação de leitura.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
Benefit (Catálogo de Benefícios)
├── id: UUID (PK)
├── name: String (Ex: "Vale Refeição Flash", "Plano de Saúde Unimed")
├── provider: String (Fornecedor / Operadora)
├── category: Enum ('ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'ODONTOLOGICO', 'EDUCACAO', 'CONVENIO', 'OUTRO')
├── description: Text
├── deduction_rule: String (Regra de desconto em folha, opcional/informativo)
├── active: Boolean (Default: true)
└── created_at, updated_at

EmployeeBenefit (Vínculo de Benefício do Colaborador)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── benefit_id: UUID (FK -> Benefit.id)
├── start_date: Date (Data de início do benefício)
├── end_date: Date (Data de cancelamento/término, nullable)
├── card_number_last4: String (Últimos 4 dígitos do cartão, se aplicável)
├── monthly_value: Decimal (Valor do benefício)
├── employee_deduction_value: Decimal (Valor descontado do colaborador)
├── dependents_included: JSONB (Lista de dependentes cobertos: [{ name, relationship, birth_date, cpf }])
├── status: Enum ('ATIVO', 'SUSPENSO', 'CANCELADO')
└── created_at, updated_at

Announcement (Comunicados Internos)
├── id: UUID (PK)
├── title: String
├── summary: String (Resumo curto para cards e notificações)
├── content: Text (Conteúdo rico em Markdown / HTML)
├── category: Enum ('INSTITUCIONAL', 'CAMPANHA_RH', 'EVENTO', 'BENEFICIOS', 'IMPORTANTE')
├── cover_image_url: String (Banner opcional)
├── attachments: JSONB (Array de arquivos: [{ name, url, size }])
├── is_pinned: Boolean (Fixado no topo da página inicial: true/false)
├── requires_acknowledgement: Boolean (Exige botão de confirmação de leitura)
│
│── Segmentação & Agendamento:
├── target_type: Enum ('ALL', 'SPECIFIC_DEPARTMENTS', 'SPECIFIC_UNITS', 'SPECIFIC_ROLES')
├── target_ids: JSONB (Array de IDs correspondentes ao público-alvo)
├── published_at: Timestamp (Data/hora programada para entrar no ar)
├── expires_at: Timestamp (Data de expiração da exibição, opcional)
├── author_id: UUID (FK -> User.id)
└── created_at, updated_at

AnnouncementView (Rastreamento de Leituras)
├── id: UUID (PK)
├── announcement_id: UUID (FK -> Announcement.id, indexado)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── viewed_at: Timestamp
├── acknowledged_at: Timestamp (nullable se não exigir confirmação explícita)
└── PRIMARY KEY (id), UNIQUE (announcement_id, employee_id)
```

---

## 3. Endpoints de API

### Benefícios
- `GET /api/v1/benefits/me` — Lista benefícios ativos do colaborador e seus dependentes vinculados
- `GET /api/v1/benefits` — Lista catálogo geral de benefícios cadastrados (RH)
- `POST /api/v1/benefits` — Cadastra novo benefício no catálogo
- `POST /api/v1/employees/:employeeId/benefits` — Associa benefício a um colaborador com dependentes e vigência
- `PUT /api/v1/employees/:employeeId/benefits/:id` — Atualiza situação (ex: encerramento)

### Comunicados
- `GET /api/v1/announcements` — Feed de comunicados visíveis para o colaborador logado (respeitando segmentação e agendamento)
- `GET /api/v1/announcements/:id` — Conteúdo completo do comunicado (registra visualização automática)
- `POST /api/v1/announcements/:id/acknowledge` — Confirma ciência/leitura do comunicado
- `POST /api/v1/rh/announcements` — (RH) Cria ou agenda novo comunicado com segmentação de público e anexos
- `GET /api/v1/rh/announcements/:id/metrics` — (RH) Métricas de alcance e engajamento (total de visualizações e quem leu)

---

## 4. Frontend & Interfaces

1. **Seção "Meus Benefícios" (`/beneficios/meus-beneficios`)**:
   - Cards visuais com os benefícios ativos do colaborador, detalhes de cobertura e dependentes incluídos.
2. **Mural de Comunicados (`/comunicados` e Widget na Home)**:
   - Carrossel ou lista de cards com destaques fixados, badges de categoria e marcador de **"Não Lido"**.
   - Página de leitura limpa com suporte a imagens, formatação rica e botão de confirmação de ciência.
3. **Gerenciador de Comunicados do RH (`/rh/comunicados/novo`)**:
   - Editor de texto rico (WYSIWYG / Markdown), upload de capa/anexos e seletor de público-alvo (Toda a empresa / Setores específicos).

---

## 5. Critérios de Aceite

1. Colaborador visualiza apenas comunicados destinados ao seu setor/unidade ou globais da empresa.
2. Comunicados agendados para o futuro só ficam visíveis a partir da data/hora programada.
3. O RH consegue extrair métricas de visualização de cada publicação.
4. Histórico de adesão e cancelamento de benefícios de cada funcionário é preservado no sistema.

---

## 6. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/13-beneficios-comunicados.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
