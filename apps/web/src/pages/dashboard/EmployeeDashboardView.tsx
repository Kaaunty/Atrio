import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  FileText,
  Stethoscope,
  FileCheck,
  PlusCircle,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

export const EmployeeDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await api.get('/dashboard/employee/summary');
        setData(res.data.data);
      } catch (err) {
        console.error('Erro ao carregar dashboard do colaborador:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-atrio-teal border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-atrio-text-secondary">Carregando seus indicadores de autosserviço...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-atrio-navy to-atrio-navy-dark p-6 rounded-xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-teal">
            Painel do Colaborador
          </span>
          <h2 className="text-xl font-bold mt-0.5">Olá, {data?.employee?.name || 'Colaborador'}! 👋</h2>
          <p className="text-xs text-slate-300 mt-1">
            {data?.employee?.position} · {data?.employee?.department} (Matrícula: {data?.employee?.registrationNumber})
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-xs border border-white/10">
          <ShieldCheck className="w-4 h-4 text-atrio-teal" />
          <span>Perfil Ativo · Jornada em Dia</span>
        </div>
      </div>

      {/* Cards Principais de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Banco de Horas */}
        <Card className="space-y-2 border-l-4 border-l-atrio-teal">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Banco de Horas
            </span>
            <div className="p-2 bg-atrio-teal-light text-atrio-teal-dark rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-extrabold ${data?.timeBalance?.isPositive ? 'text-semantic-success' : 'text-semantic-error'}`}>
              {data?.timeBalance?.formattedBalance || '00h 00m'}
            </span>
            <span className="text-[10px] font-semibold text-atrio-text-secondary flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-semantic-success" /> Mês Vigente
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Saldo acumulado apurado</p>
        </Card>

        {/* Card 2: Férias Disponíveis */}
        <Card className="space-y-2 border-l-4 border-l-semantic-info">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Férias Disponíveis
            </span>
            <div className="p-2 bg-semantic-info-light text-semantic-info rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.vacations?.availableDays || 0} <span className="text-sm font-semibold">dias</span>
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">
            {data?.vacations?.nextScheduledDate
              ? `Próxima saída: ${new Date(data.vacations.nextScheduledDate).toLocaleDateString('pt-BR')}`
              : 'Nenhuma programação agendada'}
          </p>
        </Card>

        {/* Card 3: Solicitações em Andamento */}
        <Card className="space-y-2 border-l-4 border-l-semantic-warning">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Solicitações Abertas
            </span>
            <div className="p-2 bg-semantic-warning-light text-semantic-warning rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.requests?.pendingCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Acompanhamento em tempo real</p>
        </Card>

        {/* Card 4: Documentos Pendentes */}
        <Card className="space-y-2 border-l-4 border-l-semantic-purple">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Documentos Pendentes
            </span>
            <div className="p-2 bg-semantic-purple-light text-semantic-purple rounded-lg">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.unreadDocumentsCount || 0}
            </span>
            {data?.unreadDocumentsCount > 0 && (
              <Badge variant="warning" size="sm">Requer Aceite</Badge>
            )}
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Políticas &amp; comprovantes</p>
        </Card>
      </div>

      {/* Barra de Ações Rápidas (Atalhos em 1 Clique) */}
      <Card className="space-y-3">
        <h3 className="text-xs font-bold text-atrio-navy uppercase tracking-wider">Ações Rápidas &amp; Autosserviço</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Solicitar Férias', icon: Calendar, to: '/ferias/minhas-ferias', color: 'bg-semantic-info-light text-semantic-info hover:bg-semantic-info/20' },
            { label: 'Ajustar Ponto', icon: Clock, to: '/ponto/meu-ponto', color: 'bg-atrio-teal-light text-atrio-teal-dark hover:bg-atrio-teal/20' },
            { label: 'Enviar Atestado', icon: Stethoscope, to: '/ponto/enviar-atestado', color: 'bg-semantic-purple-light text-semantic-purple hover:bg-semantic-purple/20' },
            { label: 'Nova Solicitação', icon: PlusCircle, to: '/solicitacoes', color: 'bg-semantic-warning-light text-semantic-warning hover:bg-semantic-warning/20' },
            { label: 'Meus Holerites', icon: FileCheck, to: '/documentos', color: 'bg-semantic-success-light text-semantic-success hover:bg-semantic-success/20' },
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(action.to)}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border border-atrio-border/60 transition-all text-center space-y-2 group hover:shadow-md ${action.color}`}
              >
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-atrio-navy leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Feed de Solicitações Recentes */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-atrio-navy">Minhas Solicitações Recentes</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/solicitacoes')}>
            Ver todas <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {data?.requests?.recentList?.length === 0 ? (
          <div className="text-center py-6 text-xs text-atrio-text-secondary">
            Nenhuma solicitação aberta no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {data?.requests?.recentList?.map((req: any) => (
              <div
                key={req.id}
                onClick={() => navigate(`/solicitacoes/${req.id}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-atrio-border hover:bg-atrio-border-light/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-atrio-teal-light text-atrio-teal-dark">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-atrio-navy">{req.typeName}</h4>
                    <span className="text-[10px] text-atrio-text-secondary">
                      Criada em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <Badge variant={req.status === 'EM_ANDAMENTO' ? 'warning' : 'info'} size="sm">
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
