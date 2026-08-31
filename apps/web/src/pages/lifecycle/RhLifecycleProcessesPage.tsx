import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  UserPlus,
  UserMinus,
  Plus,
  ChevronRight,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '../../services/api';

interface LifecycleProcessItem {
  id: string;
  processType: 'ONBOARDING' | 'OFFBOARDING';
  status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  targetDate: string;
  completedAt?: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    registrationNumber: string;
    department?: { name: string } | null;
    position?: { title: string } | null;
  };
  templateName: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export const RhLifecycleProcessesPage: React.FC = () => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<LifecycleProcessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ONBOARDING' | 'OFFBOARDING'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form para iniciar novo processo
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [processType, setProcessType] = useState<'ONBOARDING' | 'OFFBOARDING'>('ONBOARDING');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<{ id: string; name: string; registrationNumber: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lifecycle-processes', {
        params: {
          processType: activeTab !== 'ALL' ? activeTab : undefined,
          pageSize: 30,
        },
      });
      setProcesses(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar processos de Onboarding/Offboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [activeTab]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees', { params: { pageSize: 100 } });
        setEmployees(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar colaboradores:', err);
      }
    };
    fetchEmployees();
  }, []);

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert('Selecione um colaborador.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post('/lifecycle-processes', {
        employeeId: selectedEmployeeId,
        processType,
        targetDate,
      });

      setShowCreateModal(false);
      setSelectedEmployeeId('');
      fetchProcesses();
      navigate(`/rh/processos/${res.data.data.id}`);
    } catch (err) {
      console.error('Erro ao iniciar processo:', err);
      alert('Erro ao iniciar processo de Onboarding/Offboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Gestão de Onboarding & Offboarding"
      subtitle="Checklists automatizados para admissão, integração e desligamento seguro de colaboradores"
    >
      <div className="space-y-6">
        {/* Topo com Abas e Botão de Ação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(['ALL', 'ONBOARDING', 'OFFBOARDING'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-atrio-navy text-white shadow-xs'
                    : 'bg-white border border-atrio-border text-atrio-text-secondary hover:text-atrio-navy'
                }`}
              >
                {tab === 'ALL'
                  ? 'Todos os Processos'
                  : tab === 'ONBOARDING'
                  ? '🟢 Onboarding (Admissão)'
                  : '🔴 Offboarding (Desligamento)'}
              </button>
            ))}
          </div>

          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Iniciar Novo Processo
          </Button>
        </div>

        {/* Modal de Iniciar Processo */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Iniciar Processo de Admissão / Desligamento</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProcess} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Tipo de Processo *
                  </label>
                  <Select
                    value={processType}
                    onChange={(e) => setProcessType(e.target.value as any)}
                    options={[
                      { value: 'ONBOARDING', label: '🟢 Onboarding (Admissão / Integração)' },
                      { value: 'OFFBOARDING', label: '🔴 Offboarding (Desligamento)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Colaborador *
                  </label>
                  <Select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecione um Colaborador...' },
                      ...employees.map((e) => ({
                        value: e.id,
                        label: `${e.name} (${e.registrationNumber})`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    {processType === 'ONBOARDING' ? 'Data de Admissão *' : 'Data Prevista de Desligamento *'}
                  </label>
                  <Input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                    {submitting ? 'Instanciando...' : 'Iniciar Checklist'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Grade de Processos */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando processos...
          </div>
        ) : processes.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <Layers className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum processo em andamento</h3>
            <p className="text-xs text-atrio-text-secondary">
              Não há checklists de Onboarding ou Offboarding ativos no momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processes.map((proc) => (
              <Card
                key={proc.id}
                onClick={() => navigate(`/rh/processos/${proc.id}`)}
                className="space-y-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-atrio-teal"
              >
                <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                  <div className="flex items-center gap-2">
                    {proc.processType === 'ONBOARDING' ? (
                      <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center gap-1">
                        <UserPlus className="w-4 h-4" /> ONBOARDING
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center gap-1">
                        <UserMinus className="w-4 h-4" /> OFFBOARDING
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={proc.status === 'CONCLUIDO' ? 'success' : 'warning'}
                    dot
                    size="sm"
                  >
                    {proc.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-atrio-navy">{proc.employee.name}</h3>
                  <p className="text-xs text-atrio-text-secondary">
                    {proc.employee.position?.title || '—'} · {proc.employee.department?.name || '—'}
                  </p>
                </div>

                {/* Barra de Progresso do Checklist */}
                <div className="space-y-1.5 bg-atrio-bg p-3 rounded-xl border border-atrio-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-atrio-text-secondary font-medium">Progresso do Checklist</span>
                    <span className="font-bold text-atrio-navy">
                      {proc.completedTasks} / {proc.totalTasks} ({proc.progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-atrio-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-atrio-teal rounded-full transition-all duration-300"
                      style={{ width: `${proc.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-atrio-border/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Data Alvo:{' '}
                    <strong className="text-atrio-navy font-semibold">
                      {new Date(proc.targetDate).toLocaleDateString('pt-BR')}
                    </strong>
                  </span>
                  <ChevronRight className="w-4 h-4 text-atrio-teal" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
