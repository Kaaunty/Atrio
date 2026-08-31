import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';

interface LeaveItem {
  id: string;
  leaveType: string;
  displayReason?: string;
  startDate: string;
  endDate?: string | null;
  returnDate?: string | null;
  inssReferral: boolean;
  active: boolean;
  employee: {
    id: string;
    name: string;
    registrationNumber: string;
    avatarUrl?: string | null;
    department?: { id: string; name: string } | null;
    position?: { id: string; title: string } | null;
  };
}

export const TeamAbsencesPage: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaves-of-absence', {
        params: {
          activeOnly: activeOnly ? 'true' : 'false',
          viewMode: 'manager',
        },
      });
      setLeaves(res.data.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar ausências da equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [activeOnly]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '---';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'AUXILIO_DOENCA_INSS':
      case 'ACIDENTE_TRABALHO_INSS':
        return <Badge variant="warning">Afastamento INSS (&gt;15 dias)</Badge>;
      case 'LICENCA_MATERNIDADE':
      case 'LICENCA_PATERNIDADE':
        return <Badge variant="info">Licença Parental</Badge>;
      case 'ATESTADO_MEDICO':
      default:
        return <Badge variant="success">Ausência por Saúde (Abonada)</Badge>;
    }
  };

  return (
    <AppLayout title="Ausências da Equipe">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-atrio-navy to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-atrio-teal/10 rounded-l-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-atrio-teal mb-3">
                <Users className="w-4 h-4" />
                <span>Gestão Operacional de Equipe</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ausências & Afastamentos da Equipe
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Acompanhe os períodos de afastamento homologados pelo RH para dimensionamento e cobertura de escala do seu time.
              </p>
            </div>
          </div>
        </div>

        {/* LGPD Protection Banner */}
        <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl text-slate-300 text-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-atrio-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white mb-0.5">Visão Restrita em Conformidade com a LGPD (Art. 11)</p>
            <p>
              Por diretriz legal de proteção de dados sensíveis de saúde, atestados escaneados, números de CRM médico e diagnósticos (CID) são mantidos sob sigilo do RH e Medicina do Trabalho. O gestor tem acesso exclusivo ao impacto operacional (períodos de ausência).
            </p>
          </div>
        </div>

        {/* Tabela de Ausências da Equipe */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-atrio-border">
            <div>
              <h2 className="text-lg font-bold text-atrio-text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-atrio-teal" />
                Quadro de Colaboradores Ausentes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Listagem de afastamentos vigentes e agendados
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={activeOnly ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveOnly(true)}
                className="text-xs font-bold"
              >
                Apenas Vigentes
              </Button>
              <Button
                variant={!activeOnly ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveOnly(false)}
                className="text-xs font-bold"
              >
                Histórico Completo
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Carregando ausências da equipe...
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm space-y-2">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-600">Nenhum afastamento registrado para sua equipe no momento.</p>
              <p className="text-xs text-slate-400">Todos os colaboradores estão disponíveis para a jornada regular.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-atrio-border text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo / Setor</th>
                    <th className="py-3 px-4">Período de Ausência</th>
                    <th className="py-3 px-4">Retorno Previsto</th>
                    <th className="py-3 px-4">Status Operacional</th>
                    <th className="py-3 px-4">Motivo / Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atrio-border">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-atrio-text-primary">{leave.employee?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Matrícula: {leave.employee?.registrationNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium">{leave.employee?.position?.title || '---'}</div>
                        <div className="text-[11px] text-slate-400">{leave.employee?.department?.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {formatDate(leave.startDate)} até {formatDate(leave.endDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-atrio-navy whitespace-nowrap">
                        {formatDate(leave.returnDate || leave.endDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {leave.active ? (
                          <Badge variant="warning">Colaborador Ausente</Badge>
                        ) : (
                          <Badge variant="neutral">Concluído</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getLeaveTypeBadge(leave.leaveType)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};
