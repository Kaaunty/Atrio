# ETAPA 05 — Jornadas, Meu Ponto e Cálculo de Banco de Horas

> **Fase:** Ponto Eletrônico (Fase 2)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 7, 9, 32 e 33)

---

## 1. Objetivo
Implementar o motor de cálculo de jornada de trabalho (prevista vs. realizada), apuração diária/mensal, saldo de banco de horas (créditos/débitos acumulados) e a tela de autosserviço **"Meu Ponto"** para o colaborador e consulta de equipe para gestores.

---

## 2. Modelagem de Dados

### Tabelas / Entidades Principais

```text
WorkSchedule (Jornadas de Trabalho / Escalas)
├── id: UUID (PK)
├── name: String (Ex: "Administrativo 44h - 08:00 às 18:00 (Seg-Sex)")
├── weekly_hours: Integer (Ex: 44, em horas)
├── tolerance_minutes: Integer (Tolerância legal CLT, ex: 10 min diários)
├── lunch_interval_minutes: Integer (Ex: 60 min)
├── flexible_interval: Boolean (Default: true)
├── schedule_rules: JSONB (Regras diárias: horários esperados de entrada/saída por dia da semana)
└── created_at, updated_at

TimeDailySummary (Apuração Diária Consolidada)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── date: Date (Data do dia trabalhado, indexado com employee_id)
├── expected_work_minutes: Integer (Minutos esperados no dia)
├── actual_work_minutes: Integer (Minutos efetivamente trabalhados)
├── balance_minutes: Integer (Saldo diário: actual - expected, positivo ou negativo)
├── extra_hours_minutes: Integer (Horas extras apuradas)
├── delay_minutes: Integer (Atrasos apurados)
├── absence_minutes: Integer (Faltas apuradas)
├── entries: JSONB (Array ordenado das marcações do dia: [{ id, time, source, is_adjusted }])
├── status: Enum ('OK', 'DIVERGENCIA', 'FOLGA', 'FERIADO', 'FERIAS', 'AFASTAMENTO', 'FALTA')
└── recalculated_at: Timestamp

TimeBalance (Banco de Horas - Saldo Acumulado / Histórico)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── year_month: String (Ex: "2026-08", indexado)
├── starting_balance_minutes: Integer (Saldo do início do mês)
├── total_credits_minutes: Integer (Total de créditos no mês)
├── total_debits_minutes: Integer (Total de débitos no mês)
├── manual_adjustments_minutes: Integer (Ajustes manuais autorizados)
├── closing_balance_minutes: Integer (Saldo de fechamento)
├── is_closed: Boolean (Default: false)
└── updated_at: Timestamp
```

---

## 3. Regras de Negócio e Cálculos

1. **Agrupamento de Batidas**:
   - As batidas de um dia (`TimeClockEntry` + ajustes aprovados) são ordenadas cronologicamente (E1, S1, E2, S2...).
   - Pares Entrada-Saída calculam os minutos trabalhados no período.
2. **Tolerância Legal**:
   - Variações de até 5 minutos por batida (máximo 10 minutos diários) não são computadas como crédito ou débito conforme artigo 58 da CLT.
3. **Cálculo de Saldo**:
   - $\text{Saldo Diário} = \text{Minutos Realizados} - \text{Minutos Previstos}$.
   - O saldo diário alimenta o balanço mensal e o banco de horas acumulado.

---

## 4. Endpoints de API

### Meu Ponto (Colaborador / Gestor / RH)
- `GET /api/v1/time-clock/me/today` — Resumo do dia atual e batidas registradas até o momento
- `GET /api/v1/time-clock/me/monthly?year=2026&month=8` — Espelho de ponto completo do mês com totais (previsto, realizado, saldo, atrasos, divergências)
- `GET /api/v1/time-clock/me/balance` — Saldo acumulado do banco de horas, extrato de créditos/débitos
- `GET /api/v1/time-clock/employees/:employeeId/monthly` — Visualização do espelho de ponto por gestores (equipe) ou RH
- `POST /api/v1/time-clock/recalculate` — Força reprocessamento da apuração diária de um período

---

## 5. Frontend & Interfaces

1. **Tela "Meu Ponto" (`/ponto/meu-ponto`)**:
   - Seletor de Mês/Ano.
   - Cards de Resumo no topo:
     - ⏱️ Horas Previstas
     - ⏱️ Horas Realizadas
     - ⚖️ Saldo do Mês (Verde se positivo, Vermelho se negativo)
     - 🏦 Banco de Horas Acumulado
   - Tabela Diária Detalhada (conforme modelo da proposta):
     - `Data | Entrada 1 | Saída Almoço | Retorno Almoço | Saída 2 | Saldo | Status | Ações`
   - Botão rápido de "Solicitar Ajuste" na linha com divergência.
2. **Visualização do Gestor (`/gestao/equipe/ponto`)**:
   - Consulta rápida do espelho de ponto dos colaboradores da equipe.

---

## 6. Critérios de Aceite

1. Apuração diária calcula corretamente os minutos trabalhados e o saldo com tolerâncias legais.
2. Dias não trabalhados (folga/feriado) não geram débito indevido se configurados na escala.
3. Espelho mensal renderiza claramente as batidas de cada dia, saldo do dia e saldo acumulado do mês.
4. Gestor visualiza apenas colaboradores de sua equipe e colaborador visualiza apenas seu próprio espelho.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/05-meu-ponto-banco-horas.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
