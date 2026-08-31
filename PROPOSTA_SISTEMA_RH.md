# Projeto RH Digital --- Proposta Funcional

## 1. Objetivo

Criar um sistema interno de RH que centralize a jornada do colaborador e
reduza processos manuais, mensagens dispersas, planilhas e controles
paralelos.

O sistema deve funcionar como um **Portal do Colaborador**, **Portal do
Gestor** e **Painel Administrativo do RH**, inicialmente integrado ao
sistema de ponto já utilizado pela empresa.

A proposta não é implementar folha de pagamento no primeiro momento. O
foco inicial deve ser organização, automação, rastreabilidade e
autosserviço.

------------------------------------------------------------------------

# 2. Perfis de acesso

## 2.1 Colaborador

Deve conseguir:

-   consultar seus próprios dados;
-   consultar ponto e banco de horas;
-   visualizar divergências de ponto;
-   solicitar correção de ponto;
-   enviar justificativas e anexos;
-   consultar saldo de férias;
-   solicitar férias;
-   acompanhar solicitações;
-   enviar atestados;
-   consultar documentos;
-   visualizar comunicados;
-   acompanhar treinamentos;
-   consultar avaliações e PDI, quando disponíveis.

O colaborador não deve visualizar informações privadas de outros
colaboradores.

## 2.2 Gestor

Além das funções de colaborador, deve conseguir:

-   visualizar colaboradores da própria equipe;
-   visualizar férias planejadas da equipe;
-   aprovar ou rejeitar solicitações;
-   analisar correções de ponto;
-   aprovar horas extras;
-   acompanhar banco de horas da equipe;
-   visualizar pendências;
-   acompanhar treinamentos;
-   realizar avaliações;
-   registrar feedbacks;
-   acompanhar PDI.

As permissões devem respeitar a hierarquia organizacional.

## 2.3 RH

Deve possuir acesso administrativo aos módulos de RH:

-   colaboradores;
-   cargos;
-   setores;
-   gestores;
-   ponto;
-   férias;
-   solicitações;
-   documentos;
-   benefícios;
-   treinamentos;
-   avaliações;
-   PDI;
-   onboarding;
-   offboarding;
-   comunicados;
-   relatórios;
-   indicadores.

## 2.4 Administrador

Responsável pelas configurações técnicas:

-   usuários;
-   perfis;
-   permissões;
-   integrações;
-   tipos de solicitação;
-   workflows;
-   parâmetros;
-   auditoria;
-   configurações gerais.

------------------------------------------------------------------------

# 3. Dashboard do colaborador

A página inicial deve apresentar um resumo da situação atual.

Exemplo:

-   banco de horas atual;
-   saldo de férias;
-   próxima férias;
-   quantidade de solicitações abertas;
-   documentos pendentes;
-   treinamentos pendentes;
-   últimas movimentações;
-   comunicados recentes.

## Atalhos

Disponibilizar ações rápidas:

-   Solicitar férias
-   Justificar ponto
-   Solicitar ajuste de ponto
-   Enviar atestado
-   Nova solicitação
-   Ver documentos
-   Ver meu ponto

------------------------------------------------------------------------

# 4. Cadastro de colaboradores

Criar um cadastro centralizado de colaboradores.

## Dados básicos

-   código;
-   nome;
-   CPF;
-   e-mail;
-   telefone;
-   data de nascimento;
-   endereço;
-   contato de emergência;
-   foto.

## Dados profissionais

-   matrícula;
-   cargo;
-   setor;
-   gestor;
-   empresa;
-   unidade;
-   data de admissão;
-   tipo de contrato;
-   jornada;
-   situação;
-   data de desligamento.

## Histórico

Registrar alterações importantes:

-   mudança de cargo;
-   mudança de setor;
-   mudança de gestor;
-   alteração salarial, caso seja utilizado futuramente;
-   férias;
-   afastamentos;
-   admissões;
-   desligamentos.

Nunca sobrescrever informações históricas importantes sem
rastreabilidade.

------------------------------------------------------------------------

# 5. Estrutura organizacional

## Setores

Permitir cadastro de:

-   nome;
-   responsável;
-   centro de custo, se necessário;
-   setor superior.

## Cargos

Permitir cadastro de:

-   nome;
-   descrição;
-   setor;
-   nível;
-   responsabilidades.

## Organograma

Gerar organograma automaticamente a partir de:

`Empresa → Setor → Gestor → Colaboradores`

Permitir navegar pela estrutura da empresa.

------------------------------------------------------------------------

# 6. Integração com Control iD

O Control iD deve continuar responsável pela captura das marcações de
ponto.

O novo sistema deve consumir essas informações.

Fluxo esperado:

`Control iD → Integração → Banco RH → Portal RH`

## Sincronização

Implementar processo automático para importar:

-   colaborador;
-   identificação;
-   data;
-   horário;
-   dispositivo;
-   tipo de marcação, quando disponível.

Manter a marcação original armazenada para auditoria.

## Requisitos

A integração deve ser:

-   idempotente;
-   auditável;
-   tolerante a falhas;
-   reprocessável;
-   executada automaticamente.

Criar log de sincronização contendo:

-   data da execução;
-   quantidade importada;
-   quantidade ignorada;
-   erros;
-   duração.

------------------------------------------------------------------------

# 7. Meu Ponto

Tela onde o colaborador acompanha sua jornada.

## Resumo mensal

Mostrar:

-   jornada prevista;
-   jornada realizada;
-   banco de horas;
-   horas extras;
-   atrasos;
-   faltas;
-   divergências.

## Marcações diárias

Exemplo:

  Data    Entrada   Saída almoço   Retorno   Saída   Saldo    Status
  ------- --------- -------------- --------- ------- -------- -------------
  28/08   08:02     12:04          13:01     17:58   +00:11   OK
  27/08   08:14     12:01          13:00     ---     ---      Divergência

## Divergências

Detectar situações como:

-   entrada ausente;
-   saída ausente;
-   marcação duplicada;
-   intervalo incorreto;
-   jornada abaixo do esperado;
-   atraso;
-   excesso de jornada.

------------------------------------------------------------------------

# 8. Ajuste de ponto

O colaborador deve conseguir solicitar correção.

Campos:

-   data;
-   marcação afetada;
-   horário solicitado;
-   motivo;
-   observação;
-   anexo opcional.

Fluxo sugerido:

`Colaborador → Gestor → RH → Concluído`

Cada etapa deve registrar:

-   responsável;
-   data;
-   decisão;
-   observação.

A alteração não deve apagar a marcação original.

Manter:

-   marcação original;
-   marcação corrigida;
-   motivo;
-   solicitante;
-   aprovadores.

------------------------------------------------------------------------

# 9. Banco de horas

Calcular automaticamente o saldo conforme a jornada configurada.

Disponibilizar:

-   saldo diário;
-   saldo mensal;
-   saldo acumulado;
-   créditos;
-   débitos;
-   ajustes manuais autorizados;
-   histórico.

Permitir configurar regras diferentes por jornada ou colaborador.

------------------------------------------------------------------------

# 10. Férias

## Para o colaborador

Mostrar:

-   período aquisitivo;
-   dias adquiridos;
-   dias utilizados;
-   dias disponíveis;
-   férias agendadas.

Permitir solicitar férias informando:

-   data inicial;
-   quantidade de dias;
-   observação.

## Para o gestor

Mostrar calendário da equipe para evitar sobreposição excessiva.

Permitir:

-   aprovar;
-   rejeitar;
-   solicitar alteração.

## Para o RH

Permitir:

-   validar;
-   alterar;
-   registrar;
-   cancelar;
-   acompanhar períodos próximos do vencimento.

------------------------------------------------------------------------

# 11. Central de solicitações

Criar uma central genérica de workflows.

Cada solicitação deve possuir:

-   número;
-   tipo;
-   solicitante;
-   data;
-   responsável atual;
-   prioridade;
-   status;
-   descrição;
-   anexos;
-   histórico.

## Tipos iniciais

-   ajuste de ponto;
-   justificativa;
-   atestado;
-   férias;
-   alteração cadastral;
-   declaração;
-   benefício;
-   hora extra;
-   solicitação ao RH.

## Status sugeridos

-   Rascunho
-   Aberto
-   Aguardando gestor
-   Aguardando RH
-   Em análise
-   Aprovado
-   Rejeitado
-   Concluído
-   Cancelado

------------------------------------------------------------------------

# 12. Engine de workflow

Evitar criar lógica fixa para cada solicitação.

Criar uma estrutura configurável.

Exemplo:

`Solicitação → Etapa 1 → Etapa 2 → Etapa N → Conclusão`

Cada tipo poderá definir seus próprios aprovadores.

Exemplo --- férias:

`Colaborador → Gestor → RH`

Exemplo --- alteração cadastral:

`Colaborador → RH`

Exemplo --- hora extra:

`Colaborador/Gestor → Gestor → RH`

Isso permitirá adicionar novos processos sem desenvolver todo o fluxo
novamente.

------------------------------------------------------------------------

# 13. Documentos

Criar uma central de documentos do colaborador.

Tipos possíveis:

-   holerite;
-   informe de rendimentos;
-   contrato;
-   aditivo;
-   declaração;
-   certificado;
-   recibo;
-   política interna;
-   documento pessoal.

## Funcionalidades

-   upload;
-   download;
-   categorização;
-   data de validade;
-   histórico;
-   visibilidade;
-   confirmação de leitura.

Futuramente:

-   assinatura eletrônica;
-   assinatura digital;
-   aceite de políticas.

------------------------------------------------------------------------

# 14. Atestados e afastamentos

Permitir envio de atestado pelo portal.

Campos:

-   data inicial;
-   quantidade de dias;
-   motivo/categoria;
-   observação;
-   arquivo.

Fluxo:

`Colaborador → RH`

O RH poderá:

-   validar;
-   rejeitar;
-   solicitar correção;
-   registrar afastamento.

Evitar exposição desnecessária de dados sensíveis para gestores.

------------------------------------------------------------------------

# 15. Benefícios

Cadastrar benefícios oferecidos pela empresa.

Exemplos:

-   vale-refeição;
-   vale-alimentação;
-   vale-transporte;
-   plano de saúde;
-   plano odontológico;
-   auxílio;
-   convênios.

Relacionar benefício ao colaborador.

Registrar:

-   início;
-   término;
-   situação;
-   dependentes, quando aplicável;
-   observações.

------------------------------------------------------------------------

# 16. Comunicados internos

Criar área de comunicação do RH.

Permitir publicar:

-   comunicados;
-   campanhas;
-   avisos;
-   eventos;
-   mudanças internas;
-   políticas.

Recursos:

-   publicação programada;
-   público-alvo;
-   confirmação de leitura;
-   anexos;
-   destaque na página inicial.

------------------------------------------------------------------------

# 17. Treinamentos

Cadastrar treinamentos internos e externos.

Campos:

-   nome;
-   descrição;
-   responsável;
-   validade;
-   obrigatoriedade;
-   público-alvo.

Por colaborador:

-   pendente;
-   em andamento;
-   concluído;
-   vencido.

Permitir anexar certificado.

Criar alertas de vencimento.

------------------------------------------------------------------------

# 18. Avaliação de desempenho

Implementar futuramente ciclos de avaliação.

Possibilidades:

-   autoavaliação;
-   avaliação do gestor;
-   avaliação 180°;
-   avaliação 360°.

Cadastrar critérios e notas.

Exemplos:

-   conhecimento técnico;
-   comunicação;
-   produtividade;
-   organização;
-   trabalho em equipe;
-   liderança.

Manter histórico por ciclo.

------------------------------------------------------------------------

# 19. Feedbacks

Permitir que gestores registrem feedbacks.

Tipos:

-   positivo;
-   desenvolvimento;
-   acompanhamento;
-   1:1.

Campos:

-   colaborador;
-   gestor;
-   data;
-   assunto;
-   descrição;
-   ações combinadas.

Definir claramente regras de visibilidade.

------------------------------------------------------------------------

# 20. PDI --- Plano de Desenvolvimento Individual

Permitir criar objetivos de desenvolvimento.

Cada objetivo pode possuir:

-   título;
-   descrição;
-   competência;
-   responsável;
-   prazo;
-   status;
-   ações;
-   evidências.

Status:

-   Não iniciado
-   Em andamento
-   Concluído
-   Cancelado

------------------------------------------------------------------------

# 21. Onboarding

Criar checklist automático quando um colaborador for admitido.

Exemplo:

-   criar usuário;
-   criar e-mail;
-   liberar sistemas;
-   entregar computador;
-   cadastrar no ponto;
-   entregar crachá;
-   enviar documentos;
-   treinamento inicial;
-   apresentar políticas;
-   definir gestor.

Cada tarefa deve possuir:

-   responsável;
-   prazo;
-   status.

Isso pode envolver RH, TI e gestor.

------------------------------------------------------------------------

# 22. Offboarding

Criar fluxo de desligamento.

Checklist:

-   bloquear sistemas;
-   remover acessos;
-   recolher equipamentos;
-   desativar e-mail;
-   remover acesso físico;
-   finalizar documentos;
-   registrar devoluções;
-   concluir pendências.

O sistema deve manter histórico do processo.

------------------------------------------------------------------------

# 23. Dashboard do gestor

Mostrar apenas informações relacionadas à equipe do gestor.

Indicadores:

-   quantidade de colaboradores;
-   pessoas em férias;
-   próximas férias;
-   solicitações aguardando aprovação;
-   divergências de ponto;
-   banco de horas;
-   horas extras;
-   treinamentos pendentes;
-   avaliações pendentes.

------------------------------------------------------------------------

# 24. Dashboard do RH

Painel operacional central.

## Indicadores iniciais

-   colaboradores ativos;
-   admissões;
-   desligamentos;
-   férias próximas;
-   férias vencendo;
-   divergências de ponto;
-   solicitações abertas;
-   solicitações atrasadas;
-   horas extras;
-   absenteísmo;
-   documentos pendentes;
-   treinamentos vencendo.

## Filtros

Permitir filtrar por:

-   empresa;
-   unidade;
-   setor;
-   gestor;
-   período.

------------------------------------------------------------------------

# 25. Relatórios

Criar relatórios exportáveis.

Inicialmente:

-   colaboradores;
-   admissões;
-   desligamentos;
-   férias;
-   banco de horas;
-   horas extras;
-   divergências;
-   solicitações;
-   treinamentos;
-   absenteísmo.

Exportações:

-   XLSX;
-   CSV;
-   PDF quando fizer sentido.

------------------------------------------------------------------------

# 26. Notificações

Criar serviço central de notificações.

Eventos possíveis:

-   solicitação criada;
-   solicitação aprovada;
-   solicitação rejeitada;
-   solicitação aguardando aprovação;
-   férias próximas;
-   documento disponível;
-   documento pendente;
-   treinamento vencendo;
-   divergência de ponto.

Canais possíveis:

-   dentro do sistema;
-   e-mail;
-   push futuramente.

Evitar enviar notificações diretamente dentro da regra de negócio.
Preferir eventos/fila.

------------------------------------------------------------------------

# 27. Auditoria

Toda ação administrativa relevante deve ser auditada.

Registrar:

-   usuário;
-   ação;
-   entidade;
-   registro;
-   valor anterior;
-   valor novo;
-   data/hora;
-   origem/IP quando apropriado.

Exemplos:

-   alteração de ponto;
-   aprovação;
-   rejeição;
-   alteração cadastral;
-   upload/exclusão de documento;
-   mudança de permissão.

------------------------------------------------------------------------

# 28. Permissões

Utilizar RBAC --- Role Based Access Control.

Exemplo:

``` text
rh.colaboradores.visualizar
rh.colaboradores.editar
rh.ponto.visualizar
rh.ponto.ajustar
rh.ferias.visualizar
rh.ferias.aprovar
rh.solicitacoes.visualizar
rh.solicitacoes.aprovar
rh.documentos.visualizar
rh.documentos.publicar
rh.relatorios.visualizar
rh.configuracoes.editar
```

Além da permissão, aplicar escopo.

Exemplo:

-   próprio usuário;
-   própria equipe;
-   próprio setor;
-   empresa;
-   todos.

------------------------------------------------------------------------

# 29. LGPD e segurança

Como o sistema armazenará dados de funcionários, segurança deve fazer
parte da arquitetura.

Implementar:

-   princípio do menor privilégio;
-   controle de acesso;
-   logs;
-   auditoria;
-   criptografia em trânsito;
-   proteção de arquivos;
-   backups;
-   política de retenção;
-   separação entre documentos públicos e privados.

Dados médicos e documentos sensíveis devem possuir acesso ainda mais
restrito.

------------------------------------------------------------------------

# 30. Busca global

Criar busca para RH e gestores.

Possibilitar pesquisar:

-   colaborador;
-   matrícula;
-   setor;
-   cargo;
-   solicitação;
-   documento.

------------------------------------------------------------------------

# 31. Histórico e timeline

O perfil do colaborador deve possuir uma timeline.

Exemplo:

``` text
01/07/2024 — Admissão
15/01/2025 — Alteração de cargo
10/06/2025 — Férias
01/02/2026 — Mudança de setor
18/08/2026 — Alteração cadastral
```

Isso facilita auditoria e entendimento da trajetória do funcionário.

------------------------------------------------------------------------

# 32. Arquitetura sugerida

Separar os principais domínios.

Exemplo:

``` text
RH
├── Colaboradores
├── Estrutura Organizacional
├── Ponto
├── Férias
├── Solicitações
├── Documentos
├── Benefícios
├── Treinamentos
├── Avaliações
├── PDI
├── Onboarding
├── Offboarding
├── Comunicados
├── Notificações
└── Relatórios
```

Evitar uma única entidade ou service gigante de RH.

------------------------------------------------------------------------

# 33. Entidades iniciais sugeridas

Uma primeira modelagem pode considerar:

``` text
Employee
Department
Position
EmployeeManager
WorkSchedule

TimeClockEntry
TimeClockAdjustment
TimeBalance

VacationPeriod
VacationRequest

Request
RequestType
RequestWorkflow
RequestWorkflowStep
RequestHistory
RequestAttachment

EmployeeDocument
DocumentType

Benefit
EmployeeBenefit

Training
EmployeeTraining

PerformanceCycle
PerformanceReview
PerformanceCriterion

Feedback

DevelopmentPlan
DevelopmentPlanGoal

OnboardingProcess
OnboardingTask

OffboardingProcess
OffboardingTask

Announcement

Notification

AuditLog
```

Os nomes devem ser adaptados ao padrão do projeto existente.

------------------------------------------------------------------------

# 34. API --- endpoints iniciais sugeridos

Exemplos conceituais:

``` text
GET    /api/rh/me
GET    /api/rh/me/dashboard

GET    /api/rh/employees
GET    /api/rh/employees/{id}
POST   /api/rh/employees
PUT    /api/rh/employees/{id}

GET    /api/rh/time-clock/me
GET    /api/rh/time-clock/me/month/{year}/{month}

POST   /api/rh/time-clock/adjustments
GET    /api/rh/time-clock/adjustments
POST   /api/rh/time-clock/adjustments/{id}/approve
POST   /api/rh/time-clock/adjustments/{id}/reject

GET    /api/rh/vacations/me
POST   /api/rh/vacations/requests
POST   /api/rh/vacations/requests/{id}/approve
POST   /api/rh/vacations/requests/{id}/reject

GET    /api/rh/requests
POST   /api/rh/requests
GET    /api/rh/requests/{id}

GET    /api/rh/documents/me
POST   /api/rh/employees/{id}/documents

GET    /api/rh/dashboard
GET    /api/rh/managers/me/dashboard
```

Não considerar esses endpoints como contrato definitivo. Primeiro
analisar os padrões existentes da API.

------------------------------------------------------------------------

# 35. MVP recomendado

## Fase 1 --- Fundação

Implementar:

1.  colaboradores;
2.  setores;
3.  cargos;
4.  gestores;
5.  permissões;
6.  auditoria básica.

## Fase 2 --- Ponto

Implementar:

1.  integração Control iD;
2.  marcações;
3.  espelho mensal;
4.  cálculo de saldo;
5.  divergências;
6.  solicitação de ajuste;
7.  aprovação.

## Fase 3 --- Solicitações

Implementar:

1.  central de solicitações;
2.  tipos configuráveis;
3.  workflow;
4.  histórico;
5.  anexos;
6.  notificações.

## Fase 4 --- Férias e documentos

Implementar:

1.  períodos de férias;
2.  solicitação;
3.  aprovação;
4.  calendário da equipe;
5.  central de documentos.

Após essas fases já existirá um produto interno útil.

------------------------------------------------------------------------

# 36. Segunda etapa

Depois do MVP:

-   dashboard RH;
-   dashboard gestor;
-   benefícios;
-   comunicados;
-   onboarding;
-   offboarding;
-   treinamentos;
-   relatórios avançados.

------------------------------------------------------------------------

# 37. Terceira etapa

Evoluções futuras:

-   avaliação de desempenho;
-   feedback;
-   PDI;
-   recrutamento e seleção;
-   vagas internas;
-   pesquisa de clima;
-   eNPS;
-   trilhas de carreira;
-   assinatura eletrônica;
-   integração com folha.

------------------------------------------------------------------------

# 38. Fora do escopo inicial

Não implementar inicialmente:

-   folha de pagamento própria;
-   cálculo completo de encargos;
-   eSocial;
-   cálculo de rescisão;
-   cálculo fiscal;
-   obrigações trabalhistas complexas.

Essas funcionalidades possuem alta complexidade regulatória e devem
preferencialmente ser integradas a ferramentas especializadas.

------------------------------------------------------------------------

# 39. Requisitos técnicos importantes

O Codex deve considerar desde o início:

-   arquitetura compatível com o projeto existente;
-   migrations versionadas;
-   APIs REST consistentes;
-   validação server-side;
-   autorização server-side;
-   paginação;
-   filtros;
-   ordenação;
-   auditoria;
-   soft delete quando apropriado;
-   timestamps;
-   tratamento de timezone;
-   armazenamento seguro de arquivos;
-   logs estruturados;
-   testes unitários;
-   testes de integração para workflows críticos.

------------------------------------------------------------------------

# 40. Princípios de implementação

## Não duplicar informação sem necessidade

Se dados já existem em outro sistema confiável, avaliar integração antes
de criar uma segunda fonte de verdade.

## Histórico é importante

Alterações de RH devem ser rastreáveis.

## Workflow deve ser reutilizável

Não criar um fluxo completamente diferente em código para cada nova
solicitação.

## Segurança no backend

Nunca confiar apenas em ocultar botões no frontend.

## MVP antes de complexidade

Priorizar funcionalidades que reduzam trabalho manual imediatamente.

------------------------------------------------------------------------

# 41. Critério de sucesso do MVP

O MVP será considerado útil quando um colaborador conseguir, sem entrar
em contato diretamente com o RH:

1.  acessar seu perfil;
2.  consultar seu ponto;
3.  identificar uma divergência;
4.  solicitar correção;
5.  acompanhar a aprovação;
6.  consultar banco de horas;
7.  consultar férias;
8.  solicitar férias;
9.  acompanhar solicitações;
10. acessar documentos.

E quando RH e gestores conseguirem processar essas demandas pelo próprio
sistema, mantendo histórico e auditoria.

------------------------------------------------------------------------

# 42. Orientação para implementação com Codex

Antes de escrever código, o Codex deve:

1.  analisar a arquitetura atual do projeto;
2.  identificar padrões de controllers/endpoints;
3.  identificar padrão de services/use cases;
4.  identificar padrão de repositories/data access;
5.  analisar autenticação e autorização existentes;
6.  identificar padrão de migrations;
7.  verificar convenções de nomes;
8.  verificar componentes reutilizáveis no frontend;
9.  propor a modelagem;
10. propor um plano incremental.

Não implementar todos os módulos de uma vez.

A ordem recomendada é:

``` text
Estrutura organizacional
        ↓
Colaboradores
        ↓
Permissões
        ↓
Integração Control iD
        ↓
Meu Ponto
        ↓
Ajustes de Ponto
        ↓
Central de Solicitações
        ↓
Férias
        ↓
Documentos
        ↓
Dashboard RH / Gestor
        ↓
Demais módulos
```

Cada módulo deve ser concluído com backend, frontend, autorização,
auditoria e testes antes de avançar para o próximo.
