# ETAPA 04 — Integração e Sincronização com Relógio de Ponto Control iD

> **Fase:** Ponto Eletrônico (Fase 2)  
> **Status:** Implementado  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 6, 32, 33 e 40)

---

## 1. Objetivo
Desenvolver o módulo de integração com os coletores/dispositivos **Control iD** (ou API/Software iDCloud/iDSecure), garantindo captura automática, periódica e idempotente das marcações de ponto, mantendo os registros brutos originais gravados para fins legais e de auditoria.

---

## 2. Fluxo da Integração

```text
[ Relógio Control iD / API iDSecure ]
                 │
                 ▼  (Agendador Cron / Webhook / Polling)
      [ Sync Engine do Sistema ]
                 │
        ┌────────┴────────┐
        ▼                 ▼
[ Log de Sincronização ]  [ TimeClockEntry (Original Imutável) ]
                                  │
                                  ▼
                         [ Processamento de Jornada ]
```

---

## 3. Modelagem de Dados

### Tabelas / Entidades Principais

```text
TimeClockDevice (Dispositivos / Relógios)
├── id: UUID (PK)
├── name: String (Ex: "Relógio Matriz - Portaria")
├── ip_address: String (Opcional)
├── serial_number: String (Número de série do relógio)
├── model: String (Ex: "iDFit", "iDAccess", "iDClass")
├── unit_id: UUID (FK -> Unit.id)
├── active: Boolean (Default: true)
├── api_endpoint: String (Opcional se via rede local/API)
├── auth_credentials: JSONB (Criptografado)
└── last_sync_at: Timestamp

TimeClockEntry (Marcações Brutas Originais)
├── id: UUID (PK)
├── employee_id: UUID (FK -> Employee.id, indexado)
├── registration_number: String (Matrícula/PIS informada no relógio)
├── timestamp: Timestamp (Data e hora exata da batida com timezone)
├── device_id: UUID (FK -> TimeClockDevice.id, nullable)
├── source: Enum ('CONTROL_ID_API', 'CONTROL_ID_AFDR', 'MANUAL_IMPORT', 'WEB_PORTAL')
├── nsr: BigInt (Número Sequencial de Registro do equipamento, se houver)
├── raw_payload: JSONB (Dados brutos recebidos da requisição)
├── hash: String (Unique hash de idempotência: sha256(employee_id + timestamp + device_id))
└── created_at: Timestamp (Imutável)

TimeClockSyncLog (Logs de Execução da Integração)
├── id: UUID (PK)
├── device_id: UUID (FK -> TimeClockDevice.id, nullable)
├── started_at: Timestamp
├── finished_at: Timestamp
├── total_records: Integer (Total de marcações lidas)
├── imported_records: Integer (Novas marcações salvas)
├── ignored_records: Integer (Marcações já existentes/duplicadas)
├── error_count: Integer
├── status: Enum ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED')
├── error_details: JSONB
└── triggered_by: Enum ('CRON_SCHEDULE', 'MANUAL_TRIGGER', 'WEBHOOK')
```

---

## 4. Requisitos Técnicos e Idempotência

1. **Idempotência Garantida**: Toda marcação deve gerar uma chave única (`hash` ou índice composto único `(employee_id, timestamp, device_id)`). Reexecuções do sync não podem gerar marcações duplicadas no banco.
2. **Armazenamento Imutável**: A tabela `TimeClockEntry` nunca deve sofrer `UPDATE` ou `DELETE`. É a fonte primária de verdade física das batidas.
3. **Reprocessabilidade**: O sistema deve permitir que o RH solicite reprocessamento de um período (ex: últimos 30 dias) sem corromper registros existentes.
4. **Agendamento**: Implementar rotina agendada (ex: a cada 15 ou 30 minutos) e permitir acionamento manual por administradores.

---

## 5. Endpoints de API

### Integração & Sync
- `POST /api/v1/integrations/control-id/sync` — Dispara sincronização manual (parâmetros opcionais: `deviceId`, `startDate`, `endDate`)
- `POST /api/v1/integrations/control-id/webhook` — Endpoint para receber eventos push em tempo real dos relógios Control iD
- `GET /api/v1/integrations/control-id/logs` — Histórico de sincronizações com status, total importado, erros e duração
- `GET /api/v1/integrations/control-id/devices` — Lista relógios cadastrados e status de comunicação

---

## 6. Frontend & Interfaces

1. **Painel de Integração de Ponto (`/admin/integracoes/control-id`)**:
   - Status dos relógios cadastrados (online/offline, última sincronização).
   - Botão **"Sincronizar Agora"** com feedback de progresso em tempo real.
   - Tabela de logs de sincronizações com paginação e detalhamento de erros.

---

## 7. Critérios de Aceite

1. Sincronização importa registros de forma idempotente (rodar 2x seguidas no mesmo intervalo importa 0 novos na 2ª vez).
2. Marcações não vinculadas a nenhum colaborador existente geram alerta/log detalhado sem travar a sincronização dos demais.
3. Cada execução gera um registro correspondente em `TimeClockSyncLog` com contadores exatos.
4. Os dados originais brutos permanecem inalterados e auditáveis.

---

## 8. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/04-integracao-control-id.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
