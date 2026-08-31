import { PermissionScope } from '@prisma/client';

export interface PermissionDefinition {
  code: string;
  name: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Módulo: Colaboradores & Carreira
  {
    code: 'colaboradores.visualizar',
    name: 'Visualizar Colaboradores',
    module: 'COLABORADORES',
    description: 'Permite consultar o cadastro e dados de colaboradores respeitando o escopo.',
  },
  {
    code: 'colaboradores.criar',
    name: 'Cadastrar Novo Colaborador',
    module: 'COLABORADORES',
    description: 'Permite realizar a admissão e cadastro de novos colaboradores.',
  },
  {
    code: 'colaboradores.editar',
    name: 'Editar Colaborador',
    module: 'COLABORADORES',
    description: 'Permite alterar dados cadastrais, cargo, setor, salário e gestor.',
  },
  {
    code: 'colaboradores.desligar',
    name: 'Desligar Colaborador',
    module: 'COLABORADORES',
    description: 'Permite registrar o desligamento e arquivamento de colaboradores.',
  },
  {
    code: 'timeline.visualizar',
    name: 'Visualizar Timeline Histórica',
    module: 'COLABORADORES',
    description: 'Permite acompanhar o histórico profissional e marcos de carreira.',
  },
  {
    code: 'timeline.adicionar',
    name: 'Adicionar Marco na Timeline',
    module: 'COLABORADORES',
    description: 'Permite registrar novos eventos e observações na timeline.',
  },

  // Módulo: Estrutura Organizacional
  {
    code: 'organizacao.gerenciar',
    name: 'Gerenciar Estrutura Organizacional',
    module: 'ORGANIZACAO',
    description: 'Permite criar e alterar empresas, unidades, departamentos e cargos.',
  },

  // Módulo: Ponto & Jornada
  {
    code: 'ponto.visualizar',
    name: 'Visualizar Marcações de Ponto',
    module: 'PONTO',
    description: 'Permite consultar espelho de ponto e banco de horas.',
  },
  {
    code: 'ponto.ajustar',
    name: 'Solicitar Ajuste de Ponto',
    module: 'PONTO',
    description: 'Permite solicitar inclusão ou justificativa de marcações de ponto.',
  },
  {
    code: 'ponto.aprovar',
    name: 'Aprovar Ajustes de Ponto',
    module: 'PONTO',
    description: 'Permite validar e aprovar justificativas e correções de ponto da equipe.',
  },

  // Módulo: Férias & Afastamentos
  {
    code: 'ferias.visualizar',
    name: 'Visualizar Saldo e Períodos de Férias',
    module: 'FERIAS',
    description: 'Permite consultar saldo e agendamento de férias.',
  },
  {
    code: 'ferias.solicitar',
    name: 'Solicitar Férias',
    module: 'FERIAS',
    description: 'Permite solicitar período de gozo de férias.',
  },
  {
    code: 'ferias.aprovar',
    name: 'Aprovar Solicitações de Férias',
    module: 'FERIAS',
    description: 'Permite deferir ou indeferir pedidos de férias da equipe.',
  },
  {
    code: 'ferias.gerenciar',
    name: 'Homologar e Gerenciar Férias (RH)',
    module: 'FERIAS',
    description: 'Permite homologação final e cancelamentos de agendamentos de férias.',
  },
  {
    code: 'afastamentos.visualizar',
    name: 'Visualizar Afastamentos',
    module: 'AFASTAMENTOS',
    description: 'Permite visualizar a lista e status de afastamentos vigentes.',
  },

  // Módulo: Atestados Médicos & Saúde
  {
    code: 'atestados.enviar',
    name: 'Enviar Atestado Médico',
    module: 'ATESTADOS',
    description: 'Permite enviar fotos/arquivos de atestados médicos para abono.',
  },
  {
    code: 'atestados.visualizar',
    name: 'Visualizar Histórico de Atestados',
    module: 'ATESTADOS',
    description: 'Permite consultar histórico de atestados cadastrados.',
  },
  {
    code: 'atestados.gerenciar',
    name: 'Homologar Atestados Médicos (RH)',
    module: 'ATESTADOS',
    description: 'Permite ao RH/Saúde validar, aprovar ou rejeitar atestados.',
  },
  {
    code: 'rh.atestados.visualizar_sensivel',
    name: 'Visualizar Anexos e CIDs Sensíveis',
    module: 'ATESTADOS',
    description: 'Acesso restrito a arquivos de atestados e códigos CID conforme LGPD.',
  },

  // Módulo: Solicitações & Workflows
  {
    code: 'solicitacoes.abrir',
    name: 'Abrir Solicitações Gerais',
    module: 'SOLICITACOES',
    description: 'Permite abrir solicitações de RH, atestados, benefícios e alterações.',
  },
  {
    code: 'solicitacoes.aprovar',
    name: 'Aprovar Solicitações em Workflow',
    module: 'SOLICITACOES',
    description: 'Permite analisar e despachar etapas de aprovação de solicitações.',
  },

  // Módulo: Documentos & Holerites
  {
    code: 'documentos.visualizar',
    name: 'Visualizar Documentos e Holerites',
    module: 'DOCUMENTOS',
    description: 'Permite acessar documentos e holerites vinculados ao colaborador.',
  },
  {
    code: 'documentos.enviar',
    name: 'Enviar Documentos (Upload RH)',
    module: 'DOCUMENTOS',
    description: 'Permite upload individual ou em lote de holerites e documentos para colaboradores.',
  },
  {
    code: 'documentos.gerenciar',
    name: 'Gerenciar Central de Documentos',
    module: 'DOCUMENTOS',
    description: 'Permite cadastrar, publicar políticas e gerar relatórios de leitura.',
  },

  // Módulo: Integrações & Relógios de Ponto
  {
    code: 'integracoes.visualizar',
    name: 'Visualizar Hub de Integrações',
    module: 'INTEGRACOES',
    description: 'Permite consultar o status, relógios cadastrados e logs das integrações.',
  },
  {
    code: 'integracoes.gerenciar',
    name: 'Gerenciar e Sincronizar Integrações',
    module: 'INTEGRACOES',
    description: 'Permite ativar/desativar provedores, cadastrar relógios, disparar sync e importar arquivos AFD.',
  },

  // Módulo: Administração & Auditoria
  {
    code: 'admin.rbac.gerenciar',
    name: 'Gerenciar Perfis e Permissões (RBAC)',
    module: 'ADMIN',
    description: 'Permite criar perfis, atribuir permissões e configurar escopos de acesso.',
  },
  {
    code: 'admin.auditoria.visualizar',
    name: 'Visualizar Trilha de Auditoria (LGPD)',
    module: 'ADMIN',
    description: 'Permite inspecionar logs de auditoria e histórico de alterações do sistema.',
  },
];

export interface DefaultRoleConfig {
  name: string;
  description: string;
  permissions: { code: string; scope: PermissionScope }[];
}

export const DEFAULT_SYSTEM_ROLES: DefaultRoleConfig[] = [
  {
    name: 'ADMIN',
    description: 'Administrador do Sistema com acesso irrestrito e escopo total.',
    permissions: SYSTEM_PERMISSIONS.map((p) => ({
      code: p.code,
      scope: 'ALL' as PermissionScope,
    })),
  },
  {
    name: 'RH',
    description: 'Gestão de Recursos Humanos com visão ampla da organização.',
    permissions: SYSTEM_PERMISSIONS.map((p) => ({
      code: p.code,
      scope: (p.module === 'ADMIN' ? 'ALL' : 'COMPANY') as PermissionScope,
    })),
  },
  {
    name: 'GESTOR',
    description: 'Gestor de Equipe com visão dos colaboradores liderados diretamente.',
    permissions: [
      { code: 'colaboradores.visualizar', scope: 'TEAM' },
      { code: 'timeline.visualizar', scope: 'TEAM' },
      { code: 'ponto.visualizar', scope: 'TEAM' },
      { code: 'ponto.ajustar', scope: 'SELF' },
      { code: 'ponto.aprovar', scope: 'TEAM' },
      { code: 'ferias.visualizar', scope: 'TEAM' },
      { code: 'ferias.solicitar', scope: 'SELF' },
      { code: 'ferias.aprovar', scope: 'TEAM' },
      { code: 'afastamentos.visualizar', scope: 'TEAM' },
      { code: 'atestados.visualizar', scope: 'TEAM' },
      { code: 'solicitacoes.abrir', scope: 'SELF' },
      { code: 'solicitacoes.aprovar', scope: 'TEAM' },
      { code: 'documentos.visualizar', scope: 'SELF' },
    ],
  },
  {
    name: 'COLABORADOR',
    description: 'Colaborador com acesso aos seus próprios dados e autosserviço.',
    permissions: [
      { code: 'colaboradores.visualizar', scope: 'SELF' },
      { code: 'timeline.visualizar', scope: 'SELF' },
      { code: 'ponto.visualizar', scope: 'SELF' },
      { code: 'ponto.ajustar', scope: 'SELF' },
      { code: 'ferias.visualizar', scope: 'SELF' },
      { code: 'ferias.solicitar', scope: 'SELF' },
      { code: 'atestados.enviar', scope: 'SELF' },
      { code: 'atestados.visualizar', scope: 'SELF' },
      { code: 'solicitacoes.abrir', scope: 'SELF' },
      { code: 'documentos.visualizar', scope: 'SELF' },
    ],
  },
];
