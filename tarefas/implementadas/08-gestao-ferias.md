# ETAPA 08 — Gestão de Férias e Calendário da Equipe

> **Fase:** Férias e Documentos (Fase 4)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 10, 32 e 33)

---

## 1. Objetivo
Implementar o controle de **Períodos Aquisitivos e Concessivos de Férias**, cálculo de saldo de dias (adquiridos, utilizados, agendados e disponíveis), fluxo de solicitação e aprovação de férias, além de um **Calendário Visual da Equipe** para que gestores identifiquem sobreposições de ausência antes de aprovar.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
VacationPeriod (Períodos Aquisitivos e Concessivos)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── vesting_start_date: Date (Início do período aquisitivo)
├── vesting_end_date: Date (Fim do período aquisitivo - 12 meses)
├── deadline_date: Date (Limite do período concessivo - 23 meses da admissão)
├── days_entitled: Integer (Dias de direito, padrão: 30)
├── days_taken: Integer (Dias já usufruídos)
├── days_scheduled: Integer (Dias com agendamento aprovado no futuro)
├── days_remaining: Integer (Calculado: days_entitled - days_taken - days_scheduled)
├── status: Enum ('EM_AQUISICAO', 'ADQUIRIDO', 'CONCLUIDO', 'VENCIDO')
└── created_at, updated_at

VacationRequest (Solicitações de Férias)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── vacation_period_id: UUID (FK -> VacationPeriod.id)
├── start_date: Date (Data de início das férias)
├── end_date: Date (Data de término das férias)
├── days_count: Integer (Quantidade de dias, ex: 10, 15, 20, 30)
├── sell_days_count: Integer (Abono pecuniário / "venda de férias", máx 1/3 = 10 dias)
├── advance_thirteenth: Boolean (Adiantamento do 13º salário: true/false)
├── notes: Text (Observação do colaborador)
├── status: Enum ('PENDENTE_GESTOR', 'PENDENTE_RH', 'APROVADO', 'REJEITADO', 'CANCELADO')
│
│── Pareceres:
├── manager_id: UUID (FK -> Employee.id)
├── manager_action_at: Timestamp
├── manager_notes: Text
├── rh_user_id: UUID (FK -> User.id)
├── rh_action_at: Timestamp
├── rh_notes: Text
│
└── created_at, updated_at
```

---

## 3. Regras de Negócio e Validações CLT

1. **Regras de Fracionamento (Reforma Trabalhista)**:
   - As férias podem ser divididas em até 3 períodos (se acordado).
   - Um período não pode ser inferior a 14 dias corridos.
   - Os demais períodos não podem ser inferiores a 5 dias corridos cada.
2. **Início das Férias**:
   - É vedado o início das férias nos dois dias que antecedem feriado ou dia de repouso semanal remunerado (DSR).
3. **Controle de Período Aquisitivo**:
   - O sistema gera automaticamente novo `VacationPeriod` a cada aniversário de admissão do colaborador.
   - Alerta visual no painel do RH e do Gestor para períodos com concessão próxima do vencimento (risco de férias em dobro).

---

## 4. Endpoints de API

### Para o Colaborador
- `GET /api/v1/vacations/me` — Retorna saldo de férias atual, períodos aquisitivos e histórico de solicitações
- `POST /api/v1/vacations/requests` — Cria nova solicitação de férias com validação de saldo e regras CLT
- `DELETE /api/v1/vacations/requests/:id` — Cancela solicitação pendente

### Para o Gestor
- `GET /api/v1/vacations/team/calendar?startDate=2026-09-01&endDate=2026-12-31` — Retorna grade de ausências/férias de todos os liderados
- `GET /api/v1/vacations/team/pending` — Lista solicitações de férias aguardando aprovação do gestor
- `POST /api/v1/vacations/requests/:id/manager-approve` — Gestor aprova
- `POST /api/v1/vacations/requests/:id/manager-reject` — Gestor rejeita com motivo

### Para o RH
- `GET /api/v1/vacations/rh/pending` — Fila de solicitações de férias aprovadas pelos gestores para homologação do RH
- `POST /api/v1/vacations/requests/:id/rh-approve` — RH homologa e confirma o agendamento
- `GET /api/v1/vacations/rh/expiring-alerts` — Lista colaboradores com férias próximas do vencimento do período concessivo

---

## 5. Frontend & Interfaces

1. **Tela "Minhas Férias" (`/ferias/minhas-ferias`)**:
   - Card de Destaque: Dias disponíveis para agendar, período aquisitivo atual e data limite para gozo.
   - Botão **"Solicitar Férias"** com calendário intuitivo e validação instantânea de regras.
   - Histórico de férias passadas e programadas.
2. **Calendário da Equipe para o Gestor (`/gestao/ferias/calendario`)**:
   - Visualização em Gantt / Calendário mensal colorido mostrando as férias planejadas de cada liderado para prevenir ausências simultâneas críticas no setor.
3. **Painel de Controle de Férias do RH (`/rh/ferias`)**:
   - Tabela de vencimentos com alerta visual de urgência (amarelo: < 90 dias, vermelho: < 30 dias para vencer).

---

## 6. Critérios de Aceite

1. O sistema valida se o colaborador possui saldo de dias suficiente no período aquisitivo antes de permitir o envio.
2. O sistema bloqueia agendamentos que infrinjam a CLT (período < 5 dias ou início em véspera de folga/feriado).
3. O calendário da equipe mostra com clareza períodos sobrepostos entre colaboradores do mesmo setor.
4. Após aprovação final do RH, os dias agendados debitam do saldo disponível e geram marcação de afastamento no espelho de ponto futuro.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/08-gestao-ferias.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
