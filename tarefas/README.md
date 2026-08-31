# 📋 Fluxo de Tarefas e Implementação — RH Digital

Este diretório gerencia o ciclo de vida e a execução incremental do **Sistema RH Digital**, baseado no documento mestre [`PROPOSTA_SISTEMA_RH.md`](../PROPOSTA_SISTEMA_RH.md).

---

## 🔄 Fluxo de Trabalho (Workflow)

```text
[ tarefas/pendentes/XX-tarefa.md ]
               │
               ▼  (Execução: Backend + Frontend + Testes + Auditoria)
[ Validação dos Critérios de Aceite ]
               │
               ▼  (Mover arquivo)
[ tarefas/implementadas/XX-tarefa.md ]
```

### Como executar uma etapa:
1. Abra o arquivo correspondente na pasta `tarefas/pendentes/`.
2. Siga a especificação técnica (Modelagem, APIs, Regras de Negócio, Frontend e Auditoria).
3. Execute e valide todos os itens do **Critério de Aceite e Checklist de Verificação**.
4. Mova o arquivo da pasta `pendentes/` para `implementadas/`:
   ```powershell
   Move-Item -Path "tarefas/pendentes/XX-nome-da-tarefa.md" -Destination "tarefas/implementadas/"
   ```
5. Atualize o checklist de progresso abaixo neste `README.md`.

---

## 📊 Matriz de Progresso Geral

### Fase 1: MVP — Fundação & Estrutura Base
- [x] [`00-setup-stack-arquitetura.md`](./implementadas/00-setup-stack-arquitetura.md) — Setup do Projeto, Stack (React + Vite + Node/TypeScript), Banco de Dados e Arquitetura Base
- [x] [`01-estrutura-organizacional.md`](./implementadas/01-estrutura-organizacional.md) — Empresas, Unidades, Setores, Cargos e Organograma
- [x] [`02-cadastro-colaboradores.md`](./implementadas/02-cadastro-colaboradores.md) — Cadastro Centralizado de Colaboradores e Histórico/Timeline
- [x] [`03-rbac-permissoes-auditoria.md`](./implementadas/03-rbac-permissoes-auditoria.md) — Perfis de Acesso (RBAC), Escopos e Trilha de Auditoria

### Fase 2: MVP — Ponto Eletrônico & Integração
- [x] [`04-integracao-control-id.md`](./implementadas/04-integracao-control-id.md) — Sincronização e Importação de Marcações Control iD
- [x] [`05-meu-ponto-banco-horas.md`](./implementadas/05-meu-ponto-banco-horas.md) — Visualização Meu Ponto, Espelho Mensal e Cálculo de Banco de Horas
- [x] [`06-ajuste-ponto-divergencias.md`](./implementadas/06-ajuste-ponto-divergencias.md) — Detecção de Divergências e Solicitação/Aprovação de Ajustes

### Fase 3: MVP — Workflows & Central de Solicitações
- [x] [`07-engine-workflow-solicitacoes.md`](./implementadas/07-engine-workflow-solicitacoes.md) — Engine de Workflow Dinâmico e Central de Solicitações

### Fase 4: MVP — Férias, Atestados & Documentos
- [x] [`08-gestao-ferias.md`](./implementadas/08-gestao-ferias.md) — Gestão de Períodos Aquisitivos, Solicitação e Calendário da Equipe
- [x] [`09-atestados-afastamentos.md`](./implementadas/09-atestados-afastamentos.md) — Envio de Atestados Médicos, Validação CID e Gestão de Afastamentos
- [x] [`10-central-documentos.md`](./implementadas/10-central-documentos.md) — Central de Documentos, Upload, Categorização e Confirmação de Leitura

### Fase 5: Dashboards, Relatórios & Notificações
- [x] [`11-dashboards-operacionais.md`](./implementadas/11-dashboards-operacionais.md) — Dashboards do Colaborador, Gestor e RH
- [x] [`12-relatorios-notificacoes.md`](./implementadas/12-relatorios-notificacoes.md) — Central de Notificações Multicanal e Relatórios Exportáveis (XLSX/PDF)

### Fase 6: Módulos Complementares
- [x] [`13-beneficios-comunicados.md`](./implementadas/13-beneficios-comunicados.md) — Gestão de Benefícios e Mural de Comunicados Internos
- [x] [`14-onboarding-offboarding.md`](./implementadas/14-onboarding-offboarding.md) — Checklists Automatizados de Admissão e Desligamento
- [x] [`15-treinamentos-feedback-pdi.md`](./implementadas/15-treinamentos-feedback-pdi.md) — Gestão de Treinamentos, Feedbacks (1:1) e PDI
