import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';

interface TrainingCatalogItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  workloadHours: number;
  validityMonths?: number | null;
  provider: string;
  active: boolean;
  _count: { employeeTrainings: number };
}

interface ComplianceReport {
  totalAssigned: number;
  completed: number;
  pending: number;
  expired: number;
  complianceRate: number;
}

export const RhTrainingsPage: React.FC = () => {
  const [trainings, setTrainings] = useState<TrainingCatalogItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Novo Treinamento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('OBRIGATORIO_LEGAL');
  const [workloadHours, setWorkloadHours] = useState(4);
  const [validityMonths, setValidityMonths] = useState<number | undefined>(12);
  const [provider, setProvider] = useState('Interno');
  const [submitting, setSubmitting] = useState(false);

  // Modal Atribuir Treinamento
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; registrationNumber: string }[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trRes, compRes] = await Promise.all([
        api.get('/rh/trainings'),
        api.get('/rh/trainings/compliance'),
      ]);
      setTrainings(trRes.data.data || []);
      setCompliance(compRes.data.data || null);
    } catch (err) {
      console.error('Erro ao carregar catálogo e compliance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      setSubmitting(true);
      await api.post('/rh/trainings', {
        title,
        description: description || undefined,
        category,
        workloadHours: Number(workloadHours),
        validityMonths: validityMonths ? Number(validityMonths) : undefined,
        provider,
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      fetchData();
    } catch (err) {
      console.error('Erro ao cadastrar treinamento:', err);
      alert('Erro ao cadastrar treinamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainingId || selectedEmployeeIds.length === 0) return;
    try {
      setAssigning(true);
      await api.post('/rh/trainings/assign', {
        trainingId: selectedTrainingId,
        employeeIds: selectedEmployeeIds,
      });

      setSelectedTrainingId(null);
      setSelectedEmployeeIds([]);
      fetchData();
    } catch (err) {
      console.error('Erro ao atribuir treinamento:', err);
      alert('Erro ao atribuir treinamento.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <AppLayout
      title="Gestão de Treinamentos RH & Conformidade Legal"
      subtitle="Catálogo de cursos institucionais, treinamentos de segurança (NRs) e conformidade"
    >
      <div className="space-y-6">
        {/* Cards de Métricas de Conformidade */}
        {compliance && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1 border-l-4 border-l-atrio-teal">
              <p className="text-xs text-atrio-text-secondary font-medium">Taxa de Conformidade</p>
              <p className="text-2xl font-black text-atrio-navy">{compliance.complianceRate}%</p>
              <div className="w-full h-1.5 bg-atrio-border rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-atrio-teal rounded-full"
                  style={{ width: `${compliance.complianceRate}%` }}
                />
              </div>
            </Card>

            <Card className="p-4 space-y-1 border-l-4 border-l-semantic-success">
              <p className="text-xs text-atrio-text-secondary font-medium">Concluídos</p>
              <p className="text-2xl font-black text-semantic-success">{compliance.completed}</p>
              <span className="text-[10px] text-slate-400">Total de certificados validados</span>
            </Card>

            <Card className="p-4 space-y-1 border-l-4 border-l-semantic-warning">
              <p className="text-xs text-atrio-text-secondary font-medium">Pendentes de Realização</p>
              <p className="text-2xl font-black text-semantic-warning">{compliance.pending}</p>
              <span className="text-[10px] text-slate-400">Em andamento na empresa</span>
            </Card>

            <Card className="p-4 space-y-1 border-l-4 border-l-semantic-danger">
              <p className="text-xs text-atrio-text-secondary font-medium">Vencidos (Reciclagem Necessária)</p>
              <p className="text-2xl font-black text-semantic-danger">{compliance.expired}</p>
              <span className="text-[10px] text-slate-400">Requer nova convocação</span>
            </Card>
          </div>
        )}

        {/* Topo e Ações */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-atrio-navy">Catálogo de Treinamentos Cadastrados</h2>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Treinamento
          </Button>
        </div>

        {/* Modal Novo Treinamento */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Cadastrar Novo Treinamento</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTraining} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Título do Treinamento *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Treinamento de CIPA / NR-35 / LGPD"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Categoria *
                  </label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'OBRIGATORIO_LEGAL', label: '🚨 Obrigatório Legal (NRs, CIPA, LGPD)' },
                      { value: 'INSTITUCIONAL', label: '🏢 Institucional / Integração' },
                      { value: 'TECNICO', label: '💻 Técnico e Operacional' },
                      { value: 'LIDERANCA', label: '👑 Desenvolvimento de Liderança' },
                      { value: 'OPCIONAL', label: '📚 Opcional / Eletivo' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                      Carga Horária (h) *
                    </label>
                    <Input
                      type="number"
                      required
                      min={1}
                      value={workloadHours}
                      onChange={(e) => setWorkloadHours(parseInt(e.target.value, 10))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                      Validade (Meses)
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 12"
                      value={validityMonths || ''}
                      onChange={(e) =>
                        setValidityMonths(e.target.value ? parseInt(e.target.value, 10) : undefined)
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Provedor / Instrutor
                  </label>
                  <Input
                    placeholder="Ex: Interno RH / Plataforma Parceira"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                    {submitting ? 'Cadastrando...' : 'Salvar Treinamento'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal Atribuir Treinamento */}
        {selectedTrainingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Matricular Colaboradores</h3>
                <button onClick={() => setSelectedTrainingId(null)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAssignTraining} className="space-y-3">
                <p className="text-xs text-atrio-text-secondary">
                  Selecione os colaboradores que devem realizar o treinamento:
                </p>

                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-atrio-border p-2 rounded-xl">
                  {employees.map((emp) => {
                    const isChecked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-atrio-bg cursor-pointer text-xs"
                      >
                        <span className="font-semibold text-atrio-navy">
                          {emp.name} ({emp.registrationNumber})
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                            } else {
                              setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                            }
                          }}
                          className="rounded text-atrio-teal focus:ring-atrio-teal/40"
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedTrainingId(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={assigning}>
                    {assigning ? 'Matriculando...' : `Matricular (${selectedEmployeeIds.length})`}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Grade de Treinamentos */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando treinamentos...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((tr) => (
              <Card key={tr.id} className="space-y-3 p-5 border-l-4 border-l-atrio-navy hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                  <span className="font-mono text-[10px] font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                    {tr.category}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {tr._count.employeeTrainings} matriculados
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-atrio-navy">{tr.title}</h3>
                  <p className="text-xs text-atrio-text-secondary leading-relaxed">
                    Carga Horária: <strong>{tr.workloadHours}h</strong> · Validade:{' '}
                    <strong>{tr.validityMonths ? `${tr.validityMonths} meses` : 'Sem expiração'}</strong>
                  </p>
                </div>

                <div className="pt-2 border-t border-atrio-border flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Provedor: {tr.provider}</span>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedTrainingId(tr.id)}>
                    <Users className="w-3.5 h-3.5 mr-1" /> Matricular Equipe
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
