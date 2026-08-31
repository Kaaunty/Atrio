# ETAPA 12 — Relatórios Exportáveis e Central de Notificações

> **Fase:** Dashboards e Relatórios (Fase 5)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 25, 26, 32 e 33)

---

## 1. Objetivo
Implementar:
1. **Central de Notificações Multicanal Assíncrona** (In-app e E-mail via fila de eventos), alertando sobre novas solicitações, prazos de férias, divergências de ponto e avisos de RH.
2. **Módulo de Relatórios e Exportações** nos formatos **XLSX, CSV e PDF** com filtros flexíveis por empresa, setor, período e colaborador.

---

## 2. Central de Notificações (Event-Driven)

### Modelagem de Dados

```text
Notification (Notificações do Usuário)
├── id: UUID (PK)
├── user_id: UUID (FK -> User.id, indexado)
├── title: String
├── message: Text
├── type: Enum ('INFO', 'WARNING', 'SUCCESS', 'ACTION_REQUIRED')
├── category: Enum ('PONTO', 'FERIAS', 'SOLICITACAO', 'DOCUMENTO', 'COMUNICADO', 'SISTEMA')
├── action_url: String (Link para navegar direto para o item relevante)
├── read_at: Timestamp (nullable)
├── sent_via_email: Boolean (Default: false)
└── created_at: Timestamp (Indexado)
```

### Eventos que Disparam Notificações
- `solicitacao.criada` -> Notifica o gestor / aprovador da etapa.
- `solicitacao.aprovada` / `solicitacao.rejeitada` -> Notifica o solicitante com o parecer.
- `ponto.divergencia_detectada` -> Alerta o colaborador no fechamento diário/semanal.
- `ferias.vencimento_proximo` -> Notifica RH e gestor sobre colaborador com férias vencendo.
- `documento.publicado` -> Alerta colaborador sobre novo holerite ou política com leitura obrigatória.

> [!TIP]
> Notificações de e-mail e push não devem bloquear a requisição HTTP principal; devem ser despachadas em segundo plano via fila (ex: BullMQ / Redis / Celery / Channels).

---

## 3. Módulo de Relatórios e Exportações

### Relatórios Disponíveis
1. **Relatório de Colaboradores**: Lista cadastral completa, cargos, setores, gestores, tipo de contrato e data de admissão.
2. **Relatório de Espelho de Ponto & Banco de Horas**: Resumo de horas trabalhadas, horas extras, atrasos e saldo final por setor ou empresa.
3. **Relatório de Divergências**: Listagem de todas as batidas inconsistentes em aberto no mês.
4. **Relatório de Férias e Vencimentos**: Acompanhamento de períodos concessivos e mapa de férias agendadas.
5. **Relatório de Absenteísmo e Atestados**: Total de faltas justificadas/não justificadas e atestados médicos por departamento.
6. **Relatório de Solicitações e SLA**: Volume de solicitações abertas, tempo médio de atendimento e status final.

---

## 4. Endpoints de API

### Notificações
- `GET /api/v1/notifications/me` — Lista notificações do usuário com paginação e filtro `unreadOnly`
- `GET /api/v1/notifications/me/unread-count` — Quantidade de notificações não lidas para o badge do sino
- `PATCH /api/v1/notifications/:id/read` — Marca notificação como lida
- `POST /api/v1/notifications/me/mark-all-read` — Marca todas como lidas

### Relatórios
- `POST /api/v1/reports/employees/export` — Gera arquivo (XLSX / CSV)
- `POST /api/v1/reports/time-clock/export` — Exporta espelho de ponto analítico ou sintético
- `POST /api/v1/reports/vacations/export` — Exporta mapa de períodos e concessões
- `POST /api/v1/reports/absenteeism/export` — Exporta índice de absenteísmo por setor
- `POST /api/v1/reports/time-clock/monthly-mirror-pdf` — Gera PDF do espelho de ponto para assinatura

---

## 5. Frontend & Interfaces

1. **Menu de Notificações (Sino no Topbar)**:
   - Dropdown com as notificações mais recentes, badge numérico de não lidas e atualização em tempo real ou polling suave.
   - Clique redireciona diretamente para a tela de ação.
2. **Central de Relatórios do RH (`/rh/relatorios`)**:
   - Cards com cada modalidade de relatório.
   - Painel de filtros (Período, Empresa, Departamento, Situação).
   - Botões de download: **Excel (.xlsx)**, **CSV** e **PDF**.

---

## 6. Critérios de Aceite

1. Notificações chegam ao usuário correto em tempo hábil sem afetar o tempo de resposta das transações de backend.
2. O sino de notificações reflete corretamente a contagem e permite marcar itens como lidos individualmente ou em massa.
3. Os relatórios em Excel/CSV geram planilhas formatadas, com cabeçalhos claros e dados consistentes com os filtros aplicados.
4. Geração de PDF do espelho de ponto mensal segue layout limpo e pronto para impressão/assinatura.

---

## 7. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/12-relatorios-notificacoes.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
