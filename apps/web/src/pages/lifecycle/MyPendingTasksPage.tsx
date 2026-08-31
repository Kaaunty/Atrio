import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  CheckSquare,
  CheckCircle2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';

interface PendingTaskItem {
  id: string;
  title: string;
  description?: string | null;
  category: 'RH' | 'TI' | 'GESTOR' | 'FACILITIES' | 'COLABORADOR';
  dueDate: string;
  status: string;
  process: {
    id: string;
    processType: string;
    employee: {
      name: string;
      registrationNumber: string;
      department?: { name: string } | null;
    };
  };
}

export const MyPendingTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<PendingTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PendingTaskItem | null>(null);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchMyPendingTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lifecycle-tasks/my-pending');
      setTasks(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar minhas tarefas pendentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPendingTasks();
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setCompleting(true);
      await api.patch(`/lifecycle-tasks/${selectedTask.id}/complete`, { notes });
      setSelectedTask(null);
      setNotes('');
      fetchMyPendingTasks();
    } catch (err) {
      console.error('Erro ao concluir tarefa:', err);
      alert('Erro ao concluir tarefa.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <AppLayout
      title="Minhas Tarefas de Integração & Desligamento"
      subtitle="Fila de pendências de Onboarding e Offboarding atribuídas a você ou à sua área responsável"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Modal de Conclusão */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Concluir Tarefa</h3>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleComplete} className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-atrio-navy">{selectedTask.title}</p>
                  <p className="text-[11px] text-atrio-text-secondary mt-0.5">
                    Colaborador: <strong>{selectedTask.process.employee.name}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Observações de Execução (Opcional)
                  </label>
                  <Input
                    placeholder="Ex: Tarefa executada com sucesso..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedTask(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={completing}>
                    {completing ? 'Salvação...' : 'Confirmar Conclusão'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Lista de Tarefas */}
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-atrio-border pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-atrio-teal-dark" />
              <h2 className="text-base font-bold text-atrio-navy">Pendências sob Sua Responsabilidade</h2>
            </div>

            <Badge variant="neutral" size="sm">
              {tasks.length} pendentes
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-12 text-atrio-text-secondary text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
              Carregando pendências...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-semantic-success mx-auto" />
              <h3 className="font-bold text-atrio-navy text-sm">Tudo em dia!</h3>
              <p className="text-xs text-atrio-text-secondary">
                Você não possui tarefas pendentes de Onboarding ou Offboarding no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl border border-atrio-border hover:border-atrio-teal/40 bg-white transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold uppercase text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                          {task.category}
                        </span>
                        <span className="text-xs text-atrio-text-secondary">
                          Processo: <strong>{task.process.processType}</strong> ·{' '}
                          {task.process.employee.name} ({task.process.employee.registrationNumber})
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-atrio-navy">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-atrio-text-secondary leading-relaxed mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => setSelectedTask(task)}>
                      Marcar Concluída
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-atrio-border/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-semantic-warning" /> Vencimento:{' '}
                      <strong className="text-atrio-navy font-semibold">
                        {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                      </strong>
                    </span>

                    <button
                      onClick={() => navigate(`/rh/processos/${task.process.id}`)}
                      className="text-atrio-teal font-semibold hover:underline flex items-center gap-0.5"
                    >
                      Ver Checklist Completo <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};
