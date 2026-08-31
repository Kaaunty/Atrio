import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Laptop,
  Building,
  UserCheck,
  ShieldCheck,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import { api } from '../../services/api';

interface LifecycleTask {
  id: string;
  title: string;
  description?: string | null;
  category: 'RH' | 'TI' | 'GESTOR' | 'FACILITIES' | 'COLABORADOR';
  dueDate: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'BLOQUEADA' | 'CANCELADA';
  completedAt?: string | null;
  notes?: string | null;
  assignedUser?: { email: string } | null;
  completedBy?: { email: string } | null;
}

interface ProcessDetail {
  id: string;
  processType: 'ONBOARDING' | 'OFFBOARDING';
  status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  targetDate: string;
  completedAt?: string | null;
  employee: {
    name: string;
    registrationNumber: string;
    company?: { tradeName: string } | null;
    department?: { name: string } | null;
    position?: { title: string } | null;
  };
  template?: { name: string } | null;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  groupedTasks: {
    RH: LifecycleTask[];
    TI: LifecycleTask[];
    GESTOR: LifecycleTask[];
    FACILITIES: LifecycleTask[];
    COLABORADOR: LifecycleTask[];
  };
}

export const LifecycleProcessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal de Conclusão de Tarefa
  const [selectedTask, setSelectedTask] = useState<LifecycleTask | null>(null);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/lifecycle-processes/${id}`);
      setProcess(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar processo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setCompleting(true);
      await api.patch(`/lifecycle-tasks/${selectedTask.id}/complete`, { notes });
      setSelectedTask(null);
      setNotes('');
      fetchDetail();
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err);
      alert('Erro ao concluir tarefa.');
    } finally {
      setCompleting(false);
    }
  };

  const categoriesConfig = [
    { key: 'RH', label: 'Recursos Humanos (RH)', icon: ShieldCheck, color: 'text-atrio-navy bg-slate-100' },
    { key: 'TI', label: 'Tecnologia da Informação (TI)', icon: Laptop, color: 'text-atrio-teal-dark bg-atrio-teal-light' },
    { key: 'GESTOR', label: 'Gestor da Equipe', icon: UserCheck, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'FACILITIES', label: 'Facilities & Patrimônio', icon: Building, color: 'text-amber-600 bg-amber-50' },
    { key: 'COLABORADOR', label: 'Colaborador', icon: FileCheck2, color: 'text-emerald-600 bg-emerald-50' },
  ] as const;

  return (
    <AppLayout
      title={process ? `Checklist: ${process.employee.name}` : 'Detalhes do Processo'}
      subtitle="Acompanhamento e execução de tarefas de integração ou desligamento por área responsável"
    >
      <div className="space-y-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/rh/processos')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos Processos
        </Button>

        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando checklist...
          </div>
        ) : !process ? (
          <Card className="text-center py-12 text-atrio-text-secondary text-sm">
            Processo não encontrado.
          </Card>
        ) : (
          <>
            {/* Cabeçalho do Processo */}
            <Card className="space-y-4 bg-gradient-to-br from-atrio-navy to-slate-900 text-white p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-atrio-teal/20 text-atrio-teal px-2.5 py-0.5 rounded border border-atrio-teal/30">
                      {process.processType}
                    </span>
                    <Badge variant={process.status === 'CONCLUIDO' ? 'success' : 'warning'} dot size="sm">
                      {process.status}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-black text-white">{process.employee.name}</h1>
                  <p className="text-xs text-slate-300">
                    Matrícula: {process.employee.registrationNumber} · {process.employee.position?.title || '—'} ·{' '}
                    {process.employee.department?.name || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/10">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Progresso Geral</p>
                    <p className="text-xl font-black text-atrio-teal">
                      {process.completedTasks} / {process.totalTasks} ({process.progressPercentage}%)
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-atrio-teal rounded-full transition-all duration-500"
                  style={{ width: `${process.progressPercentage}%` }}
                />
              </div>
            </Card>

            {/* Modal de Conclusão de Tarefa */}
            {selectedTask && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                    <h3 className="font-bold text-sm text-atrio-navy">Concluir Tarefa do Checklist</h3>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-atrio-navy">
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCompleteTask} className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-atrio-navy">{selectedTask.title}</p>
                      {selectedTask.description && (
                        <p className="text-xs text-atrio-text-secondary mt-1">{selectedTask.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                        Observações / Notas de Auditoria (Opcional)
                      </label>
                      <Input
                        placeholder="Ex: E-mail criado e notebook entregue com o termo assinado..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedTask(null)}>
                        Cancelar
                      </Button>
                      <Button variant="primary" size="sm" type="submit" disabled={completing}>
                        {completing ? 'Registrando...' : 'Marcar como Concluída'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* Agrupamento de Tarefas por Responsável */}
            <div className="space-y-6">
              {categoriesConfig.map((catConfig) => {
                const tasks = process.groupedTasks[catConfig.key] || [];
                if (tasks.length === 0) return null;
                const Icon = catConfig.icon;

                return (
                  <Card key={catConfig.key} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${catConfig.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm text-atrio-navy">{catConfig.label}</h3>
                      </div>
                      <span className="text-xs text-atrio-text-secondary font-semibold">
                        {tasks.filter((t) => t.status === 'CONCLUIDA').length} / {tasks.length} concluídas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            task.status === 'CONCLUIDA'
                              ? 'bg-atrio-teal-light/20 border-atrio-teal/30'
                              : 'bg-white border-atrio-border'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {task.status === 'CONCLUIDA' ? (
                                <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-semantic-warning shrink-0" />
                              )}
                              <h4
                                className={`text-xs font-bold ${
                                  task.status === 'CONCLUIDA'
                                    ? 'line-through text-atrio-text-secondary'
                                    : 'text-atrio-navy'
                                }`}
                              >
                                {task.title}
                              </h4>
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-atrio-text-secondary leading-relaxed pl-6">
                                {task.description}
                              </p>
                            )}

                            {task.notes && (
                              <p className="text-[10px] text-slate-500 italic pl-6 pt-0.5">
                                Nota: "{task.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Prazo:{' '}
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>

                            {task.status !== 'CONCLUIDA' ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedTask(task)}
                              >
                                Marcar Concluída
                              </Button>
                            ) : (
                              <span className="text-[11px] font-bold text-semantic-success bg-semantic-success-light px-2.5 py-1 rounded-full">
                                CONCLUÍDA
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};
