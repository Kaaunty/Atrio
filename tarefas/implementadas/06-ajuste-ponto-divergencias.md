# ETAPA 06 — Detecção de Divergências e Ajustes de Ponto

> **Fase:** Ponto Eletrônico (Fase 2)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 7, 8, 32 e 33)

---

## 1. Objetivo
Detectar automaticamente anomalias e divergências de marcação no espelho de ponto e disponibilizar o fluxo completo de **Solicitação de Ajuste de Ponto** (Colaborador → Gestor → RH), garantindo preservação da marcação original e registro da versão corrigida com trilha de aprovação.

---

## 2. Tipos de Divergências Detectadas

O motor de consistência de ponto deve classificar automaticamente os seguintes tipos de divergência:
- `ENTRADA_AUSENTE`: Ausência da primeira batida do dia.
- `SAIDA_AUSENTE` / `MARCACAO_IMPAR`: Número ímpar de batidas registradas (ex: entrou, saiu pro almoço e não registrou retorno/saída).
- `MARCACAO_DUPLICADA`: Múltiplas batidas registradas no mesmo minuto ou intervalo suspeito (< 2 min).
- `INTERVALO_INCORRETO`: Tempo de intervalo de almoço inferior ao mínimo legal (ex: < 60 min ou < 15 min em 6h).
- `JORNADA_INCOMPLETA`: Carga horária realizada significativamente abaixo do previsto sem justificativa.
- `EXCESSO_JORNADA`: Horas extras não autorizadas ou jornada diária superior ao limite de 10 horas.

---

## 3. Modelagem de Dados

### Tabelas / Entidades Principais

```text
TimeClockAdjustment (Solicitações de Ajuste de Ponto)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── date: Date (Data da marcação a ser ajustada)
├── adjustment_type: Enum ('INCLUSAO', 'ALTERACAO', 'EXCLUSAO_DUPLICADA', 'JUSTIFICATIVA_FALTA')
├── target_time: Time (Horário solicitado para o ponto)
├── original_entry_id: UUID (FK -> TimeClockEntry.id, nullable)
├── original_timestamp: Timestamp (Cópia do valor original para preservação histórica)
├── reason: String (Motivo: ex: "Esquecimento de crachá", "Serviço externo", "Consulta médica", "Falha no leitor")
├── notes: Text (Observação detalhada do colaborador)
├── attachment_url: String (Comprovante / atestado opcional)
├── status: Enum ('PENDENTE_GESTOR', 'PENDENTE_RH', 'APROVADO', 'REJEITADO', 'CANCELADO')
│
│── Trilha de Aprovação:
├── manager_id: UUID (FK -> Employee.id, Gestor avaliador)
├── manager_action_at: Timestamp
├── manager_notes: Text
├── rh_user_id: UUID (FK -> User.id, Responsável RH avaliador)
├── rh_action_at: Timestamp
├── rh_notes: Text
│
└── created_at, updated_at
```

---

## 4. Fluxo e Regras de Negócio

```text
[ Colaborador ] -> Cria Solicitação com Data, Horário, Motivo e Anexo
      │
      ▼ (Notificação / Pendência)
[ Gestor da Equipe ] -> Analisa e Aprova/Rejeita com parecer
      │ (Se Aprovado pelo Gestor)
      ▼
[ RH ] -> Homologa / Conclui o Ajuste
      │
      ▼
[ Recalcular Dia ] -> Gera batida ajustada e atualiza saldo diário/mensal
```

1. **Preservação do Original**: Uma batida original em `TimeClockEntry` nunca é deletada ou modificada. A apuração diária passa a considerar o ajuste homologado marcando a batida como `is_adjusted = true`.
2. **Justificativa Obrigatória**: Rejeições por parte do Gestor ou RH exigem preenchimento obrigatório de parecer explicativo.

---

## 5. Endpoints de API

### Solicitações de Ajuste
- `POST /api/v1/time-clock/adjustments` — Cria solicitação de ajuste com upload de anexo opcional
- `GET /api/v1/time-clock/adjustments/me` — Lista ajustes solicitados pelo colaborador logado
- `GET /api/v1/time-clock/adjustments/team` — Lista ajustes pendentes da equipe do gestor autenticado
- `GET /api/v1/time-clock/adjustments/rh` — Lista ajustes para análise do RH com filtros avançados
- `POST /api/v1/time-clock/adjustments/:id/manager-approve` — Gestor aprova (encaminha para o RH)
- `POST /api/v1/time-clock/adjustments/:id/manager-reject` — Gestor rejeita (com justificativa)
- `POST /api/v1/time-clock/adjustments/:id/rh-approve` — RH homologa (dispara recálculo automático da data)
- `POST /api/v1/time-clock/adjustments/:id/rh-reject` — RH rejeita (com justificativa)
- `DELETE /api/v1/time-clock/adjustments/:id` — Colaborador cancela solicitação se ainda estiver pendente

---

## 6. Frontend & Interfaces

1. **Modal / Formulário de Ajuste (`<RequestAdjustmentModal />`)**:
   - Pré-preenche a data selecionada do espelho.
   - Campos: Tipo de Ajuste, Horário Solicitado, Motivo padronizado (dropdown), Descrição e Upload de comprovante.
2. **Painel de Aprovações do Gestor (`/gestao/aprovacoes/ponto`)**:
   - Tabela de solicitações pendentes com comparativo visual: *Horário Original vs. Horário Solicitado*.
   - Botões de Ação Rápida: **Aprovar** e **Rejeitar** (com abertura de diálogo para justificativa).
3. **Painel de Homologação do RH (`/rh/ponto/ajustes`)**:
   - Fila de homologação com filtros por departamento, gestor e período.

---

## 7. Critérios de Aceite

1. Sistema identifica dias com batidas ímpares ou ausentes e destaca o status `DIVERGENCIA` na tela do colaborador.
2. Ao solicitar ajuste, o gestor recebe a pendência em sua área de gestão.
3. Ao ser homologado pelo RH, o espelho do dia é automaticamente recalculado e reflete o novo saldo de horas.
4. Trilha de auditoria completa registra todas as etapas (quem solicitou, quem aprovou e com quais comentários).

---

## 8. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/06-ajuste-ponto-divergencias.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
