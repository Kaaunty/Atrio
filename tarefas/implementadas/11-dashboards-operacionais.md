# ETAPA 11 — Dashboards Operacionais: Colaborador, Gestor e RH

> **Fase:** Dashboards e Relatórios (Fase 5)  
> **Status:** Pendente  
> **Referência:** [`PROPOSTA_SISTEMA_RH.md`](../../PROPOSTA_SISTEMA_RH.md) (Seções 3, 23, 24, 30, 32 e 33)

---

## 1. Objetivo
Desenvolver as páginas iniciais e painéis de controle personalizados por perfil de acesso:
1. **Dashboard do Colaborador**: Visão consolidada da jornada, saldo de horas/férias, solicitações abertas e atalhos rápidos de autosserviço.
2. **Dashboard do Gestor**: Visão tática da equipe (férias planejadas, ausências, pendências de aprovação, divergências e horas extras).
3. **Dashboard do RH**: Central de comando operacional da empresa (headcount, admissões/desligamentos, férias a vencer, índice de absenteísmo e fila de solicitações).

---

## 2. Indicadores e Estrutura dos Dashboards

### 2.1 Dashboard do Colaborador (`/dashboard/colaborador`)
- **Cards de Status**:
  - Saldo de Banco de Horas atual (positivo/negativo).
  - Dias de Férias Disponíveis e data da próxima programação.
  - Solicitações em andamento (com link para detalhes).
  - Documentos / Treinamentos pendentes de leitura.
- **Barra de Ações Rápidas (Atalhos)**:
  - 🏖️ Solicitar Férias
  - ⏱️ Justificar / Ajustar Ponto
  - 🩺 Enviar Atestado
  - 📝 Nova Solicitação
  - 📄 Meus Holerites
- **Últimas Movimentações**: Feed com as últimas atualizações de solicitações e comunicados recentes.

### 2.2 Dashboard do Gestor (`/dashboard/gestor`)
- **Indicadores da Equipe (Cards)**:
  - Total de colaboradores no time.
  - Colaboradores em férias ou afastados hoje.
  - Pendências aguardando aprovação do gestor (Ajustes de ponto, Férias, Horas Extras).
  - Divergências de ponto da equipe nesta semana/mês.
  - Total de horas extras acumuladas no time no mês vigente.
- **Gráficos e Listas Rápidas**:
  - Mini-calendário de ausências da equipe para os próximos 30 dias.
  - Tabela de pendências com ação rápida de aprovação direta.

### 2.3 Dashboard do RH (`/dashboard/rh`)
- **Métricas Globais com Filtros** (Empresa, Unidade, Setor, Período):
  - Headcount de Colaboradores Ativos.
  - Admissões e Desligamentos no mês (Turnover simplificado).
  - Férias com risco de vencimento (concessão vencendo em < 60 dias).
  - Taxa de Absenteísmo estimada (faltas e afastamentos / dias úteis).
  - Total de divergências de ponto pendentes na empresa.
  - Fila geral de solicitações do RH (novas, em andamento, atrasadas por SLA).
- **Busca Global Rápida**: Barra de busca universal (Colaborador, CPF, Matrícula, Setor, Solicitação).

---

## 3. Endpoints de API

### Agregações de Dashboard
- `GET /api/v1/dashboard/employee/summary` — Dados consolidados do colaborador logado
- `GET /api/v1/dashboard/manager/summary` — Indicadores táticos da equipe do gestor autenticado
- `GET /api/v1/dashboard/rh/summary?companyId=...&departmentId=...&period=2026-08` — Indicadores operacionais globais com filtros dinâmicos
- `GET /api/v1/search/global?q=...` — Mecanismo de busca global para RH e Gestores

---

## 4. Frontend & Componentes

1. **Roteamento Inteligente**:
   - Ao acessar `/`, o sistema redireciona automaticamente para a visão padrão mais adequada ao perfil (`/dashboard/colaborador`, `/dashboard/gestor` ou `/dashboard/rh`), permitindo alternância caso o usuário possua múltiplos papéis.
2. **Componentes de Métricas Reutilizáveis**:
   - `<MetricCard title="Saldo de Horas" value="+12:30" trend="up" icon={Clock} />`
   - `<PendingApprovalsWidget />` com ações inline.
   - `<ExpiringVacationsAlertTable />`.

---

## 5. Critérios de Aceite

1. Dados dos dashboards são carregados via consultas indexadas e otimizadas sem gargalo de performance.
2. Gestor visualiza exclusivamente os dados agregados dos seus subordinados.
3. Colaborador consegue acessar todas as ações frequentes através dos atalhos rápidos em 1 clique.
4. Filtros de Empresa e Setor no Dashboard do RH recalculam as métricas instantaneamente.

---

## 6. Transição de Etapa
Ao concluir e validar todos os itens acima:
```powershell
Move-Item -Path "tarefas/pendentes/11-dashboards-operacionais.md" -Destination "tarefas/implementadas/"
```
Marque a etapa no checklist do [`tarefas/README.md`](../README.md).
