import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  HeartHandshake, 
  GraduationCap, 
  Building2, 
  ShieldCheck, 
  ShieldAlert,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Cpu,
  CheckSquare,
  Stethoscope,
  Megaphone,
  UserPlus,
  Compass,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionScope } from '../../services/authService';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
  permission?: {
    code: string;
    minScope?: PermissionScope;
  };
  allowedRoles?: string[];
  customVisible?: (ctx: {
    hasPermission: (code: string, minScope?: PermissionScope) => boolean;
    hasRole: (...roles: string[]) => boolean;
    roles: string[];
  }) => boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user, employee, roles, logout, hasPermission, hasRole } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const savedScrollTop = sessionStorage.getItem('atrio_sidebar_scroll_top');
    if (savedScrollTop) {
      nav.scrollTop = Number(savedScrollTop);
    }

    return () => {
      sessionStorage.setItem('atrio_sidebar_scroll_top', String(nav.scrollTop));
    };
  }, []);

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    logout();
    navigate('/login');
  };

  const rawSections: NavSection[] = [
    {
      title: 'MINHA ÁREA',
      items: [
        { label: 'Início / Visão Geral', to: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
        { 
          label: 'Meu Ponto', 
          to: '/ponto/meu-ponto', 
          icon: <Clock className="w-5 h-5" />, 
          permission: { code: 'ponto.visualizar', minScope: 'SELF' } 
        },
        { 
          label: 'Enviar Atestado', 
          to: '/ponto/enviar-atestado', 
          icon: <Stethoscope className="w-5 h-5" />, 
          permission: { code: 'atestados.enviar', minScope: 'SELF' } 
        },
        { 
          label: 'Minhas Férias', 
          to: '/ferias/minhas-ferias', 
          icon: <Calendar className="w-5 h-5" />, 
          permission: { code: 'ferias.visualizar', minScope: 'SELF' } 
        },
        { 
          label: 'Meus Benefícios', 
          to: '/beneficios/meus-beneficios', 
          icon: <HeartHandshake className="w-5 h-5" /> 
        },
        { 
          label: 'Comunicados', 
          to: '/comunicados', 
          icon: <Megaphone className="w-5 h-5" /> 
        },
        { 
          label: 'Tarefas de Integração', 
          to: '/processos/minhas-tarefas', 
          icon: <UserPlus className="w-5 h-5" /> 
        },
        { 
          label: 'Meus Treinamentos', 
          to: '/desenvolvimento/treinamentos', 
          icon: <GraduationCap className="w-5 h-5" /> 
        },
        { 
          label: 'Feedbacks & 1:1', 
          to: '/desenvolvimento/feedbacks', 
          icon: <Megaphone className="w-5 h-5" /> 
        },
        { 
          label: 'Meu PDI', 
          to: '/desenvolvimento/pdi', 
          icon: <Compass className="w-5 h-5" /> 
        },
        { 
          label: 'Solicitações', 
          to: '/solicitacoes', 
          icon: <FileText className="w-5 h-5" />, 
          permission: { code: 'solicitacoes.abrir', minScope: 'SELF' } 
        },
        { 
          label: 'Meus Documentos', 
          to: '/documentos', 
          icon: <FileText className="w-5 h-5" />, 
          permission: { code: 'documentos.visualizar', minScope: 'SELF' } 
        },
        { 
          label: 'Notificações', 
          to: '/notificacoes', 
          icon: <Bell className="w-5 h-5" /> 
        },
      ],
    },
    {
      title: 'GESTÃO DE EQUIPE',
      items: [
        { 
          label: 'Colaboradores', 
          to: '/colaboradores', 
          icon: <Users className="w-5 h-5" />, 
          permission: { code: 'colaboradores.visualizar', minScope: 'TEAM' } 
        },
        { 
          label: 'Ponto da Equipe', 
          to: '/gestao/equipe/ponto', 
          icon: <Clock className="w-5 h-5" />, 
          permission: { code: 'ponto.visualizar', minScope: 'TEAM' } 
        },
        { 
          label: 'Aprovações de Ponto', 
          to: '/gestao/aprovacoes/ponto', 
          icon: <CheckSquare className="w-5 h-5" />, 
          permission: { code: 'ponto.aprovar', minScope: 'TEAM' } 
        },
        { 
          label: 'Férias da Equipe', 
          to: '/gestao/ferias/calendario', 
          icon: <Calendar className="w-5 h-5" />, 
          permission: { code: 'ferias.aprovar', minScope: 'TEAM' } 
        },
        { 
          label: 'Ausências da Equipe', 
          to: '/gestao/equipe/ausencias', 
          icon: <Users className="w-5 h-5" />, 
          permission: { code: 'afastamentos.visualizar', minScope: 'TEAM' } 
        },
      ],
    },
    {
      title: 'ADMINISTRAÇÃO DE RH',
      items: [
        { 
          label: 'Homologação Ponto RH', 
          to: '/rh/ponto/ajustes', 
          icon: <ShieldCheck className="w-5 h-5" />, 
          customVisible: (ctx) => ctx.hasPermission('ponto.aprovar', 'COMPANY') || ctx.hasRole('ADMIN', 'RH')
        },
        { 
          label: 'Gestão de Férias RH', 
          to: '/rh/ferias', 
          icon: <Calendar className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH']
        },
        { 
          label: 'Atestados Médicos RH', 
          to: '/rh/atestados', 
          icon: <Stethoscope className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH']
        },
        { 
          label: 'Central de Documentos RH', 
          to: '/rh/documentos/gestao', 
          icon: <FileText className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH']
        },
        { 
          label: 'Gestão de Benefícios RH', 
          to: '/rh/beneficios', 
          icon: <HeartHandshake className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH'] 
        },
        { 
          label: 'Onboarding & Offboarding', 
          to: '/rh/processos', 
          icon: <UserPlus className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH', 'GESTOR'] 
        },
        { 
          label: 'Gestão de Treinamentos RH', 
          to: '/rh/treinamentos', 
          icon: <GraduationCap className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH'] 
        },
      ],
    },
    {
      title: 'ESTRUTURA & RELATÓRIOS',
      items: [
        { 
          label: 'Estrutura & Setores', 
          to: '/organizacao', 
          icon: <Building2 className="w-5 h-5" />, 
          permission: { code: 'organizacao.gerenciar', minScope: 'COMPANY' } 
        },
        { 
          label: 'Escalas & Jornadas', 
          to: '/organizacao/escalas', 
          icon: <Calendar className="w-5 h-5" />, 
          permission: { code: 'organizacao.gerenciar', minScope: 'COMPANY' } 
        },
        { 
          label: 'Treinamentos & PDI', 
          to: '/desenvolvimento', 
          icon: <GraduationCap className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH', 'GESTOR'] 
        },
        { 
          label: 'Relatórios Corporativos', 
          to: '/rh/relatorios', 
          icon: <BarChart3 className="w-5 h-5" />, 
          allowedRoles: ['ADMIN', 'RH', 'GESTOR'] 
        },
      ],
    },
    {
      title: 'SISTEMA & SEGURANÇA',
      items: [
        { 
          label: 'Integrações', 
          to: '/admin/integracoes', 
          icon: <Cpu className="w-5 h-5" />, 
          customVisible: (ctx) => ctx.hasRole('ADMIN') || ctx.hasPermission('integracoes.visualizar', 'COMPANY')
        },
        { 
          label: 'Controle de Acesso (RBAC)', 
          to: '/admin/permissoes', 
          icon: <ShieldCheck className="w-5 h-5" />, 
          customVisible: (ctx) => ctx.hasRole('ADMIN') || ctx.hasPermission('admin.rbac.gerenciar', 'ALL') || ctx.hasPermission('rbac.gerenciar', 'ALL')
        },
        { 
          label: 'Trilha de Auditoria (LGPD)', 
          to: '/admin/auditoria', 
          icon: <ShieldAlert className="w-5 h-5" />, 
          customVisible: (ctx) => ctx.hasRole('ADMIN', 'RH') || ctx.hasPermission('admin.auditoria.visualizar', 'COMPANY') || ctx.hasPermission('auditoria.visualizar', 'COMPANY')
        },
        { 
          label: 'Configurações', 
          to: '/admin/configuracoes', 
          icon: <Settings className="w-5 h-5" />, 
          allowedRoles: ['ADMIN'] 
        },
      ],
    },
  ];

  const isItemVisible = (item: NavItem): boolean => {
    // 1. Função customizada de visibilidade
    if (item.customVisible) {
      return item.customVisible({ hasPermission, hasRole, roles });
    }

    // 2. Papéis permitidos (se definidos)
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      if (!hasRole(...item.allowedRoles)) {
        return false;
      }
    }

    // 3. Permissão granular e escopo mínimo (se definidos)
    if (item.permission) {
      if (!hasPermission(item.permission.code, item.permission.minScope)) {
        return false;
      }
    }

    return true;
  };

  // Filtra as seções mantendo apenas itens permitidos e omitindo seções que ficarem vazias
  const visibleSections = rawSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isItemVisible),
    }))
    .filter((section) => section.items.length > 0);

  const displayName = employee?.name || user?.email?.split('@')[0] || 'Usuário Átrio';
  const primaryRole = roles[0] || 'COLABORADOR';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const renderSidebarContent = (isMobile: boolean) => (
    <>
      {/* Topo da Sidebar: Logo Oficial do Átrio */}
      <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#04162e] shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img src="/logo-white.png" alt="Átrio Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Átrio</span>
        </div>

        {/* Botão Fechar exclusivo para Mobile */}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navegação Intermediária com Scroll Independente e Filtragem por Perfil */}
      <nav ref={!isMobile ? navRef : undefined} className="flex-1 px-3 py-4 space-y-5 overflow-y-auto min-h-0 custom-scrollbar">
        {visibleSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {section.title && (
              <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {section.title}
              </h2>
            )}
            {section.items.map((item, iIdx) => (
              <NavLink
                key={iIdx}
                to={item.to}
                onClick={() => {
                  if (isMobile && onCloseMobile) {
                    onCloseMobile();
                  }
                }}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-inner'
                      : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Indicador lateral Teal ativo */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-atrio-teal rounded-r" />
                    )}
                    <span
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-atrio-teal' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full bg-atrio-teal text-atrio-navy-dark font-bold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé da Sidebar: Usuário Logado & Logout (Sempre Fixo no Fim) */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#04162e] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-atrio-teal-dark text-white flex items-center justify-center font-bold text-xs border border-atrio-teal/30 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-atrio-teal font-mono truncate uppercase">{primaryRole}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors shrink-0"
          title="Encerrar Sessão"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar Desktop Fixa */}
      <aside className="hidden lg:flex w-64 bg-atrio-navy-dark h-full flex-col shrink-0 border-r border-slate-800 text-slate-300 select-none z-30">
        {renderSidebarContent(false)}
      </aside>

      {/* Drawer Mobile com Backdrop Suave */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Escuro */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Container Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-atrio-navy-dark h-full flex flex-col shadow-2xl border-r border-slate-800 text-slate-300 select-none z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
