import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Calendar,
  Compass,
} from 'lucide-react';
import { api } from '../../services/api';

interface GoalItem {
  id: string;
  title: string;
  competency: string;
  targetDate: string;
  status: 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  actionSteps?: string | null;
  evidenceNotes?: string | null;
}

interface PlanItem {
  id: string;
  title: string;
  periodYear: number;
  status: string;
  mentor?: { name: string; registrationNumber: string } | null;
  goals: GoalItem[];
}

export const DevelopmentPlanPage: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Adicionar Meta
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [competency, setCompetency] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionSteps, setActionSteps] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Modal Evidência / Conclusão
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [updatingGoal, setUpdatingGoal] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/development-plans/me');
      setPlans(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar PDI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !goalTitle || !competency) return;
    try {
      setSubmittingGoal(true);
      await api.post(`/development-plans/${selectedPlanId}/goals`, {
        title: goalTitle,
        competency,
        targetDate,
        actionSteps: actionSteps || undefined,
      });

      setSelectedPlanId(null);
      setGoalTitle('');
      setCompetency('');
      setActionSteps('');
      fetchPlans();
    } catch (err) {
      console.error('Erro ao adicionar meta:', err);
      alert('Erro ao adicionar meta ao PDI.');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleCompleteGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      setUpdatingGoal(true);
      await api.patch(`/development-plans/goals/${selectedGoal.id}`, {
        status: 'CONCLUIDO',
        evidenceNotes,
      });

      setSelectedGoal(null);
      setEvidenceNotes('');
      fetchPlans();
    } catch (err) {
      console.error('Erro ao concluir meta:', err);
      alert('Erro ao atualizar meta.');
    } finally {
      setUpdatingGoal(false);
    }
  };

  return (
    <AppLayout
      title="PDI — Plano de Desenvolvimento Individual"
      subtitle="Roadmap de evolução de carreira, competências técnicas e comportamentais com evidências de entregas"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Modal Adicionar Meta */}
        {selectedPlanId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Adicionar Nova Meta ao PDI</h3>
                <button onClick={() => setSelectedPlanId(null)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddGoal} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Objetivo / Meta *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Dominar Arquitetura Limpa e Microserviços"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Competência Associada *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Conhecimento Técnico Avançado ou Comunicação"
                    value={competency}
                    onChange={(e) => setCompetency(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Data Limite Alvo *
                  </label>
                  <Input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Ações Práticas a Executar
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-atrio-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-atrio-teal/40"
                    placeholder="Detalhamento das etapas de desenvolvimento..."
                    value={actionSteps}
                    onChange={(e) => setActionSteps(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedPlanId(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={submittingGoal}>
                    {submittingGoal ? 'Salvando...' : 'Adicionar Meta'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal Registrar Evidência */}
        {selectedGoal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Concluir Meta & Registrar Evidência</h3>
                <button onClick={() => setSelectedGoal(null)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCompleteGoal} className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-atrio-navy">{selectedGoal.title}</p>
                  <p className="text-[11px] text-atrio-text-secondary mt-0.5">
                    Competência: <strong>{selectedGoal.competency}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Evidências e Resultados Alcançados
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-3 py-2 text-xs border border-atrio-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-atrio-teal/40"
                    placeholder="Descreva os projetos entregues, certificações obtidas ou links comprobatórios..."
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedGoal(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={updatingGoal}>
                    {updatingGoal ? 'Atualizando...' : 'Marcar como Concluída'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Lista de Planos */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando PDI...
          </div>
        ) : plans.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <Compass className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum PDI ativo cadastrado</h3>
            <p className="text-xs text-atrio-text-secondary">
              Alinhe com seu gestor para estruturar seu Plano de Desenvolvimento Individual.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => {
              const totalGoals = plan.goals.length;
              const completedGoals = plan.goals.filter((g) => g.status === 'CONCLUIDO').length;
              const progressPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

              return (
                <Card key={plan.id} className="space-y-5 p-6 border-l-4 border-l-atrio-teal">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-atrio-border pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-atrio-teal-dark bg-atrio-teal-light px-2.5 py-0.5 rounded">
                          PDI {plan.periodYear}
                        </span>
                        <Badge variant="success" size="sm" dot>
                          {plan.status}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold text-atrio-navy">{plan.title}</h2>
                      {plan.mentor && (
                        <p className="text-xs text-atrio-text-secondary">
                          Mentor de Carreira / Gestor: <strong>{plan.mentor.name}</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-atrio-text-secondary font-medium uppercase tracking-wider">
                          Progresso das Metas
                        </p>
                        <p className="text-lg font-bold text-atrio-navy">
                          {completedGoals} / {totalGoals} ({progressPct}%)
                        </p>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => setSelectedPlanId(plan.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Nova Meta
                      </Button>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full h-2 bg-atrio-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-atrio-teal rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Metas do PDI */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-atrio-navy uppercase tracking-wider">
                      Metas &amp; Competências
                    </h3>

                    {plan.goals.length === 0 ? (
                      <p className="text-xs text-atrio-text-secondary italic">
                        Nenhuma meta adicionada a este PDI. Clique em "+ Nova Meta" para começar.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {plan.goals.map((goal) => (
                          <div
                            key={goal.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              goal.status === 'CONCLUIDO'
                                ? 'bg-atrio-teal-light/20 border-atrio-teal/30'
                                : 'bg-white border-atrio-border'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  {goal.competency}
                                </span>
                                <h4
                                  className={`text-xs font-bold ${
                                    goal.status === 'CONCLUIDO'
                                      ? 'line-through text-atrio-text-secondary'
                                      : 'text-atrio-navy'
                                  }`}
                                >
                                  {goal.title}
                                </h4>
                              </div>

                              {goal.actionSteps && (
                                <p className="text-[11px] text-atrio-text-secondary leading-relaxed pt-1">
                                  <strong>Ações:</strong> {goal.actionSteps}
                                </p>
                              )}

                              {goal.evidenceNotes && (
                                <p className="text-[10px] text-emerald-700 font-medium bg-emerald-50 p-2 rounded-lg mt-1">
                                  <strong>Evidência:</strong> "{goal.evidenceNotes}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Prazo:{' '}
                                {new Date(goal.targetDate).toLocaleDateString('pt-BR')}
                              </span>

                              {goal.status !== 'CONCLUIDO' ? (
                                <Button variant="secondary" size="sm" onClick={() => setSelectedGoal(goal)}>
                                  Registrar Evidência
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
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
