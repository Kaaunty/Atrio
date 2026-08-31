import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  MessageSquare,
  Plus,
  Calendar,
  CheckSquare,
  User,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface FeedbackItem {
  id: string;
  feedbackType: 'POSITIVO' | 'DESENVOLVIMENTO' | 'REUNIAO_1ON1' | 'ALINHAMENTO';
  subject: string;
  content: string;
  actionItems?: { task: string; deadline?: string; completed?: boolean }[] | null;
  visibility: string;
  feedbackDate: string;
  author: {
    id: string;
    email: string;
    employee?: { name: string } | null;
  };
}

export const FeedbacksPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isManagerOrRh = hasRole('ADMIN', 'RH', 'GESTOR');

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form de Novo Feedback / 1:1
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedbackType, setFeedbackType] = useState<string>('REUNIAO_1ON1');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [actionTask, setActionTask] = useState('');
  const [actionItems, setActionItems] = useState<{ task: string; deadline?: string; completed?: boolean }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; registrationNumber: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchMyFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedbacks/me');
      setFeedbacks(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  useEffect(() => {
    if (isManagerOrRh) {
      const fetchEmployees = async () => {
        try {
          const res = await api.get('/employees', { params: { pageSize: 100 } });
          setEmployees(res.data.data || []);
        } catch (err) {
          console.error('Erro ao carregar colaboradores:', err);
        }
      };
      fetchEmployees();
    }
  }, [isManagerOrRh]);

  const handleAddActionItem = () => {
    if (!actionTask.trim()) return;
    setActionItems([...actionItems, { task: actionTask.trim(), completed: false }]);
    setActionTask('');
  };

  const handleCreateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !subject || !content) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/feedbacks', {
        employeeId: selectedEmployeeId,
        feedbackType,
        subject,
        content,
        actionItems: actionItems.length > 0 ? actionItems : undefined,
      });

      setShowCreateModal(false);
      setSelectedEmployeeId('');
      setSubject('');
      setContent('');
      setActionItems([]);
      fetchMyFeedbacks();
    } catch (err) {
      console.error('Erro ao registrar feedback:', err);
      alert('Erro ao registrar feedback/1:1.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'POSITIVO':
        return <Badge variant="success" size="sm">👏 Feedback Positivo</Badge>;
      case 'DESENVOLVIMENTO':
        return <Badge variant="warning" size="sm">📈 Oportunidade de Melhoria</Badge>;
      case 'REUNIAO_1ON1':
        return <Badge variant="info" size="sm">🤝 Reunião 1:1</Badge>;
      default:
        return <Badge variant="neutral" size="sm">📌 Alinhamento</Badge>;
    }
  };

  return (
    <AppLayout
      title="Espaço de Feedbacks & Reuniões 1:1"
      subtitle="Registro seguro de conversas de alinhamento, desenvolvimento de liderança e acordos de carreira"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Topo com Botão de Ação para Gestores */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-atrio-text-secondary">
            <Lock className="w-4 h-4 text-atrio-teal-dark" />
            <span>Conversas protegidas com sigilo e confidencialidade.</span>
          </div>

          {isManagerOrRh && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Registrar Novo Feedback / 1:1
            </Button>
          )}
        </div>

        {/* Modal Registrar Feedback */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg space-y-4 bg-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Registrar Reunião 1:1 ou Feedback</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateFeedback} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Colaborador Destinatário *
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
                    Tipo de Feedback *
                  </label>
                  <Select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                    options={[
                      { value: 'REUNIAO_1ON1', label: '🤝 Reunião 1:1 Periódica' },
                      { value: 'POSITIVO', label: '👏 Feedback Positivo / Reconhecimento' },
                      { value: 'DESENVOLVIMENTO', label: '📈 Ponto de Desenvolvimento / Orientação' },
                      { value: 'ALINHAMENTO', label: '📌 Alinhamento de Expectativas' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Assunto Principal *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Alinhamento de Metas Q3 e Mentoria de Liderança"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Pontos Discutidos e Destaques *
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-3 py-2 text-xs border border-atrio-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-atrio-teal/40"
                    placeholder="Descreva os tópicos abordados durante a conversa..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                {/* Acordos Combinados */}
                <div className="space-y-2 pt-2 border-t border-atrio-border">
                  <label className="block text-xs font-semibold text-atrio-navy">
                    Acordos e Ações Combinadas (Action Items)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicione um compromisso ou tarefa de alinhamento..."
                      value={actionTask}
                      onChange={(e) => setActionTask(e.target.value)}
                    />
                    <Button variant="secondary" size="sm" type="button" onClick={handleAddActionItem}>
                      Adicionar
                    </Button>
                  </div>

                  {actionItems.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {actionItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs bg-atrio-bg p-2 rounded-lg border border-atrio-border/60"
                        >
                          <span className="text-atrio-navy font-medium">• {item.task}</span>
                          <button
                            type="button"
                            onClick={() => setActionItems(actionItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Registrar Feedback'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Timeline de Feedbacks */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando feedbacks...
          </div>
        ) : feedbacks.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum feedback registrado</h3>
            <p className="text-xs text-atrio-text-secondary">
              Suas sessões de 1:1 e orientações com a liderança aparecerão nesta linha do tempo.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <Card key={fb.id} className="space-y-3 p-5 border-l-4 border-l-atrio-navy hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-atrio-border pb-3">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(fb.feedbackType)}
                    <h3 className="font-bold text-sm text-atrio-navy">{fb.subject}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Registrado por:{' '}
                      <strong className="text-atrio-navy font-semibold">
                        {fb.author.employee?.name || fb.author.email}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />{' '}
                      {new Date(fb.feedbackDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-atrio-text-secondary leading-relaxed whitespace-pre-line bg-atrio-bg p-3.5 rounded-xl border border-atrio-border/60">
                  {fb.content}
                </p>

                {/* Acordos Combinados */}
                {fb.actionItems && Array.isArray(fb.actionItems) && fb.actionItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-atrio-border/60">
                    <h4 className="text-xs font-bold text-atrio-navy flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-atrio-teal" /> Acordos e Ações Combinadas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fb.actionItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-atrio-border text-xs text-atrio-navy"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-atrio-teal shrink-0" />
                          <span>{item.task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
