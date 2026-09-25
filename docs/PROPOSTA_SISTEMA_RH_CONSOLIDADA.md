# Proposta Consolidada — Sistema Integrado de RH e SST

> Este documento reconcilia o `PROPOSTA_SISTEMA_RH.md` (proposta técnica anterior, já em
> parte implementada em `apps/api` e `apps/web`) com o novo documento de requisitos
> enviado pela RH (`docs/PROJETO - SISTEMA INTEGRADO DE RH e SST.docx`) e o e-mail de
> priorização recebido em 2026-09. Não substitui o `PROPOSTA_SISTEMA_RH.md`, serve como
> mapa de gaps e roteiro de entregas.

## 1. Origem dos dois documentos

- **`PROPOSTA_SISTEMA_RH.md`** (raiz do repo): plano técnico/arquitetural, escrito antes
  do e-mail novo da RH, cobrindo com mais profundidade a parte de implementação
  (entidades sugeridas, endpoints REST, engine de workflow genérico, RBAC, LGPD).
- **`docs/PROJETO - SISTEMA INTEGRADO DE RH e SST.docx`**: especificação de negócio mais
  recente e completa, escrita pela RH, com 16 módulos e um roteiro de 6 etapas de
  desenvolvimento definido pelo cliente.
- **`docs/SISTEMA DE RH - LAYOUT.pdf`**: mockups visuais (17 páginas) de referência para
  as telas de cada módulo.

O documento novo é mais completo em escopo de negócio (inclui Segurança do Trabalho,
Recrutamento e Seleção, QLP detalhado — nenhum desses estava no plano técnico anterior)
e já vem com uma ordem de prioridade definida pelo cliente, que deve guiar o roadmap.

## 2. Matriz de status — módulo do cliente x implementação atual

| # | Módulo (docx da RH) | Status no código (`apps/api/src/modules`) | Observação |
|---|---|---|---|
| 01 | Minha Área / Portal do Colaborador | `dashboard`, `employees` | Base existe |
| 02 | Portal do Gestor | `dashboard`, `employees` | Base existe, validar consultas gerenciais |
| 03 | Departamento Pessoal | `employees`, `organization`, `lifecycle` | Base sólida |
| 04 | Frequência e Assiduidade | `time-clock`, `integrations` | `TimeClockEntry`, `TimeBalance`, `WorkSchedule`, `TimeClockAdjustment` já existem; falta migrar todo o tratamento de ponto (hoje parcialmente no Control iD) pra cá |
| 05 | Gestão de Férias | `vacations` | Base existe |
| 06 | Gestão de Benefícios | `benefits` | Base existe |
| 07 | QLP — Quadro de Lotação de Pessoal | **Não existe** | Módulo mais detalhado do docx novo, com regras contábeis próprias de lotação/headcount por setor, função e turno |
| 08 | Saúde Ocupacional | `health`, `medical-certificates` | Base existe |
| 09 | Segurança do Trabalho | **Não existe** | EPIs, acidentes (CAT), inspeções, CIPA, SIPATMA, DDS, PGR, PCMSO, LTCAT |
| 10 | Recrutamento e Seleção | **Não existe** | Vagas, candidatos, etapas do processo seletivo |
| 11 | Avaliações e Feedbacks | Parcial (`development`?) | Precisa confirmar se cobre avaliação de experiência/desempenho/competências + planos de ação |
| 12 | Treinamento e Desenvolvimento | Parcial (`development`) | Capacitações, certificados, matriz de treinamento, PDI |
| 13 | Documentos e Assinaturas | `documents` | Base existe |
| 14 | Comunicação Interna | `announcements` | Base existe |
| 15 | Relatórios e Indicadores | `reports` | Base existe, precisa consolidar dados dos módulos novos |
| 16 | Administração do Sistema | `rbac`, `auth`, `audit`, `organization` | Base sólida (estrutura organizacional, setores, cargos, turnos, usuários, permissões) |

Central de Solicitações (workflow de aprovação genérico, transversal a vários módulos):
já existe como `requests` (`RequestType`, `RequestWorkflow`, `RequestWorkflowStep`,
`Request`, `RequestHistory`) — corresponde ao engine desenhado no
`PROPOSTA_SISTEMA_RH.md`.

## 3. Roteiro de etapas definido pelo cliente (e-mail)

O cliente propôs a seguinte sequência de desenvolvimento. Mantida na íntegra por ser a
priorização de negócio; ao lado, o gap de implementação de cada etapa.

### 1ª Etapa — Estrutura Inicial e Cadastro Central
- Módulo 16 — Administração do Sistema: estrutura organizacional, setores, cargos,
  funções, turnos, usuários e permissões de acesso.
- Módulo 03 — Departamento Pessoal: cadastro central dos colaboradores e demais
  profissionais (dados pessoais, contratuais), evitando recadastro da mesma pessoa em
  áreas diferentes do sistema.
- **Gap:** nenhum crítico — `rbac`, `auth`, `employees`, `organization` já cobrem a base.
  Foco deve ser validar completude de campos e RBAC/scopes.

### 2ª Etapa — Frequência e Controle do Quadro de Pessoal
- Módulo 04 — Frequência e Assiduidade: integração com relógio de ponto para importação
  automática das marcações.
- Módulo 07 — QLP: acompanhamento da quantidade de profissionais por setor, função e
  turno, incluindo atualização por afastamento/retorno.
- **Gap:** QLP não existe — é a maior peça faltante desta etapa e do sistema como um
  todo. Precisa levantar as regras contábeis de lotação detalhadas no Módulo 07 do docx
  antes de modelar.

### 3ª Etapa — Rotinas Administrativas
- Módulo 05 — Gestão de Férias (períodos aquisitivos/concessivos, saldos, programação,
  solicitações e aprovações).
- Módulo 06 — Gestão de Benefícios (cadastro, vinculação, adesões, descontos, custos).
- Módulo 13 — Documentos e Assinaturas (emissão, armazenamento, controle de documentos,
  assinaturas e termos de ciência).
- **Gap:** nenhum crítico — `vacations`, `benefits`, `documents` já existem; validar
  cobertura de assinatura eletrônica/termos de ciência.

### 4ª Etapa — Saúde Ocupacional e Segurança do Trabalho
- Módulo 08 — Saúde Ocupacional (exames, atestados, afastamentos, retornos).
- Módulo 09 — Segurança do Trabalho (EPIs, acidentes, inspeções, CIPA, SIPATMA, DDS,
  treinamentos e documentos pertinentes).
- **Gap:** Segurança do Trabalho não existe — módulo novo a criar do zero (EPIs, CAT,
  CIPA, SIPATMA, DDS, PGR, PCMSO, LTCAT).

### 5ª Etapa — Gestão das Equipes e Desenvolvimento
- Módulo 02 — Portal do Gestor (acompanhamento das equipes, solicitações, aprovações,
  consultas gerenciais).
- Módulo 10 — Recrutamento e Seleção (solicitações de contratação, vagas, candidatos,
  processos seletivos).
- Módulo 11 — Avaliações e Feedbacks (avaliações de experiência, desempenho,
  competências, feedbacks, planos de ação).
- Módulo 12 — Treinamento e Desenvolvimento (capacitações, certificados, matriz de
  treinamento, PDI).
- **Gap:** Recrutamento e Seleção não existe. Avaliações/Feedbacks e Treinamento
  precisam de verificação de cobertura em `development`.

### 6ª Etapa — Comunicação, Indicadores e Portal do Colaborador
- Módulo 14 — Comunicação Interna (comunicados, público-alvo, confirmação de leitura).
- Módulo 15 — Relatórios e Indicadores (consolidação das informações dos módulos para
  tomada de decisão).
- Módulo 01 — Minha Área / Portal do Colaborador (configuração dos acessos e
  funcionalidades disponíveis ao colaborador, incluindo acesso futuro via celular).
- **Gap:** nenhum crítico — `announcements`, `reports`, `dashboard` já existem; foco em
  consolidar indicadores de todos os módulos novos (QLP, SST, Recrutamento) nos
  relatórios quando estiverem prontos.

## 4. Resumo dos gaps críticos (módulos inexistentes)

1. **QLP — Quadro de Lotação de Pessoal** (2ª etapa) — maior prioridade de criação, por
   entrar cedo no roteiro e ter regras contábeis próprias.
2. **Segurança do Trabalho** (4ª etapa) — EPIs, CAT, CIPA, SIPATMA, DDS, PGR, PCMSO,
   LTCAT.
3. **Recrutamento e Seleção** (5ª etapa) — vagas, candidatos, processo seletivo.
4. Confirmar cobertura de **Avaliações e Feedbacks** e **Treinamento e Desenvolvimento**
   dentro do módulo `development` existente, ou desmembrar em módulos próprios.

## 5. Próximos passos sugeridos

- Validar esta matriz com o time antes de abrir tickets.
- Abrir épicos/stories no board seguindo a ordem das 6 etapas do cliente (1ª etapa já
  tem base pronta — pode ir direto para refinamento de gaps residuais).
- Priorizar levantamento detalhado das regras do módulo QLP junto à RH antes de
  modelar o schema (é o módulo com maior detalhamento contábil no docx).
