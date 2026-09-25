import React, { useEffect, useState } from 'react';
import { LayoutGrid, RefreshCw, Users, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { api } from '../../services/api';
import {
  CONTRACT_TYPE_OPTIONS,
  LABOR_CLASSIFICATION_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  labelFor,
} from '../../components/qlp/qlpConstants';

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  title: string;
}

const situationBadge = (situation: string) => {
  switch (situation) {
    case 'ABAIXO_MINIMO':
      return <Badge variant="danger" size="sm" dot>Abaixo do Mínimo</Badge>;
    case 'ACIMA_MAXIMO':
      return <Badge variant="warning" size="sm" dot>Acima do Máximo</Badge>;
    case 'OK':
      return <Badge variant="success" size="sm" dot>Dentro do Parâmetro</Badge>;
    default:
      return <Badge variant="neutral" size="sm">Sem Parâmetro</Badge>;
  }
};

export const QlpDashboardPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    departmentId: '',
    positionId: '',
    shiftType: '',
    laborClassification: '',
    contractType: '',
  });

  useEffect(() => {
    api
      .get('/departments', { params: { active: 'true' } })
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    if (!filters.departmentId) {
      setPositions([]);
      return;
    }
    api
      .get('/positions', { params: { departmentId: filters.departmentId, pageSize: 200, active: 'true' } })
      .then((res) => setPositions(res.data.data || []))
      .catch(() => setPositions([]));
  }, [filters.departmentId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const res = await api.get('/qlp/dashboard', { params });
      setDashboard(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar painel de lotação:', err);
      setDashboard(null);
      setError(
        (err as any)?.response?.data?.message ||
          'Não foi possível carregar o painel de lotação. Verifique se a API está atualizada.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const totals = dashboard?.totals || {};
  const comparison: any[] = dashboard?.comparison || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <LayoutGrid className="w-6 h-6 text-atrio-teal" />
              Quadro de Lotação de Pessoal
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Compare o efetivo real contra os parâmetros de dimensionamento definidos por setor e função.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchDashboard}
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-indigo-500">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Efetivo Total</span>
              <p className="text-2xl font-black text-slate-800">{totals.headcount ?? 0}</p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-rose-500">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Abaixo do Mínimo</span>
              <p className="text-2xl font-black text-slate-800">
                {comparison.filter((c) => c.situation === 'ABAIXO_MINIMO').length}
              </p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acima do Máximo</span>
              <p className="text-2xl font-black text-slate-800">
                {comparison.filter((c) => c.situation === 'ACIMA_MAXIMO').length}
              </p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dentro do Parâmetro</span>
              <p className="text-2xl font-black text-slate-800">
                {comparison.filter((c) => c.situation === 'OK').length}
              </p>
            </div>
          </Card>
        </div>

        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-bold text-atrio-text-primary">Filtros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select
              label="Setor"
              value={filters.departmentId}
              onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, positionId: '' }))}
            >
              <option value="">Todos os setores</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>

            <Select
              label="Função"
              value={filters.positionId}
              onChange={(e) => setFilters((f) => ({ ...f, positionId: e.target.value }))}
              disabled={!filters.departmentId}
            >
              <option value="">Todas as funções</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>

            <Select
              label="Turno"
              value={filters.shiftType}
              onChange={(e) => setFilters((f) => ({ ...f, shiftType: e.target.value }))}
            >
              <option value="">Todos os turnos</option>
              {SHIFT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <Select
              label="Classificação"
              value={filters.laborClassification}
              onChange={(e) => setFilters((f) => ({ ...f, laborClassification: e.target.value }))}
            >
              <option value="">Todas</option>
              {LABOR_CLASSIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>

            <Select
              label="Tipo de Vínculo"
              value={filters.contractType}
              onChange={(e) => setFilters((f) => ({ ...f, contractType: e.target.value }))}
            >
              <option value="">Todos</option>
              {CONTRACT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-atrio-text-primary">Comparativo Efetivo x Parâmetro</h3>
            <p className="text-xs text-atrio-text-secondary">
              Situação do quadro por setor, função e turno, frente aos parâmetros de dimensionamento vigentes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3">Função</th>
                  <th className="py-2.5 px-3">Turno</th>
                  <th className="py-2.5 px-3 text-center">Atual</th>
                  <th className="py-2.5 px-3 text-center">Mínimo</th>
                  <th className="py-2.5 px-3 text-center">Ideal</th>
                  <th className="py-2.5 px-3 text-center">Máximo</th>
                  <th className="py-2.5 px-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{row.department?.name || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.position?.title || 'Todas'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.shiftType ? labelFor(SHIFT_TYPE_OPTIONS, row.shiftType) : 'Todos'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{row.currentQuantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{row.minQuantity ?? '—'}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{row.plannedQuantity ?? '—'}</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{row.maxQuantity ?? '—'}</td>
                    <td className="py-2.5 px-3">{situationBadge(row.situation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && comparison.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};
