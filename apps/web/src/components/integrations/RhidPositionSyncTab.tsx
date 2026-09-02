import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { integrationService } from '../../services/integrationService';
import { FeedbackDialog, FeedbackMetric } from '../ui/FeedbackDialog';
import {
  Briefcase,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Check,
  Loader2,
  Settings,
  Users,
  Building2,
  Clock,
} from 'lucide-react';

interface PositionSyncItem {
  key: string;
  title: string;
  level: string;
  departmentName?: string | null;
  status: 'SYNCED' | 'ATRIO_ONLY' | 'RHID_ONLY';
  atrioId?: string | null;
  rhidId?: number | null;
  employeesCount: number;
}

interface RhidPositionSyncTabProps {
  onOpenSettings: () => void;
}

export const RhidPositionSyncTab: React.FC<RhidPositionSyncTabProps> = ({ onOpenSettings }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingOrg, setSyncingOrg] = useState(false);
  const [data, setData] = useState<{
    totalAtrio: number;
    totalRhid: number;
    totalSynced: number;
    totalAtrioOnly: number;
    totalRhidOnly: number;
    items: PositionSyncItem[];
  } | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SYNCED' | 'ATRIO_ONLY' | 'RHID_ONLY'>('ALL');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type?: 'success' | 'warning' | 'error' | 'info';
    title: string;
    description?: string;
    metrics?: FeedbackMetric[];
  }>({
    isOpen: false,
    title: '',
  });

  const loadOverview = async () => {
    try {
      setLoading(true);
      setActionMessage(null);
      const overview = await integrationService.getRhidPositionsOverview();
      setData(overview);
    } catch (err: any) {
      console.error('Falha ao carregar visão de cargos:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Falha ao conectar com o RHiD.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredItems) {
      setSelectedKeys(new Set(filteredItems.map((i) => i.key)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  const handleImport = async (positionIds?: number[]) => {
    try {
      setSyncing(true);
      setActionMessage(null);

      let idsToImport = positionIds;
      if (!idsToImport && selectedKeys.size > 0 && data) {
        idsToImport = data.items
          .filter((i) => selectedKeys.has(i.key) && i.rhidId)
          .map((i) => i.rhidId as number);
      }

      const res = await integrationService.importRhidPositions(idsToImport);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Cargos Importados!',
        description: res.message,
        metrics: [
          { label: 'Novos Criados', value: res.createdCount, icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Atualizados', value: res.updatedCount, icon: <RefreshCw className="w-5 h-5" /> },
        ],
      });
      setSelectedKeys(new Set());
      await loadOverview();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Falha na Importação',
        description: err.response?.data?.message || err.message || 'Erro ao importar cargos do RHiD.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncOrg = async () => {
    try {
      setSyncingOrg(true);
      const res = await integrationService.syncRhidOrganization();
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Estrutura Sincronizada com Sucesso!',
        description: 'Departamentos, Cargos e Escalas vinculados a todos os colaboradores.',
        metrics: [
          { label: 'Departamentos', value: res.departmentsCount, icon: <Building2 className="w-5 h-5" /> },
          { label: 'Cargos', value: res.positionsCount, icon: <Briefcase className="w-5 h-5" /> },
          { label: 'Escalas / Horários', value: res.schedulesCount, icon: <Clock className="w-5 h-5" /> },
          { label: 'Colaboradores', value: res.employeesUpdated, icon: <Users className="w-5 h-5" /> },
        ],
      });
      await loadOverview();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Falha na Sincronização',
        description: err.response?.data?.message || err.message || 'Falha ao sincronizar estrutura.',
      });
    } finally {
      setSyncingOrg(false);
    }
  };

  const filteredItems = data?.items.filter((item) => {
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Alerta de Ação */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2.5 text-sm font-semibold">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cadastrados no Átrio</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{data?.totalAtrio ?? '—'}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-slate-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cadastrados no RHiD</div>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">{data?.totalRhid ?? '—'}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Sincronizados</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{data?.totalSynced ?? '—'}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendentes no RHiD</div>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">{data?.totalRhidOnly ?? '—'}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Ações e Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        <div className="p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50/70">
          <div className="inline-flex flex-wrap items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold gap-1">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Todos
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filterStatus === 'ALL' ? 'bg-slate-100 text-slate-800' : 'bg-slate-300/60 text-slate-700'
              }`}>
                {data?.items.length || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('SYNCED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'SYNCED'
                  ? 'bg-white text-emerald-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-200/50'
              }`}
            >
              Sincronizados
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filterStatus === 'SYNCED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300/60 text-slate-700'
              }`}>
                {data?.totalSynced || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('RHID_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'RHID_ONLY'
                  ? 'bg-white text-indigo-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-indigo-800 hover:bg-slate-200/50'
              }`}
            >
              Apenas no RHiD
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filterStatus === 'RHID_ONLY' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-300/60 text-slate-700'
              }`}>
                {data?.totalRhidOnly || 0}
              </span>
            </button>
            <button
              onClick={() => setFilterStatus('ATRIO_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'ATRIO_ONLY'
                  ? 'bg-white text-amber-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-slate-200/50'
              }`}
            >
              Apenas no Átrio
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filterStatus === 'ATRIO_ONLY' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300/60 text-slate-700'
              }`}>
                {data?.totalAtrioOnly || 0}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncOrg}
              disabled={loading || syncing || syncingOrg}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold text-xs"
            >
              {syncingOrg ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              )}
              Sincronizar com Colaboradores
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenSettings}
              className="text-xs text-slate-700"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Configurar RHiD
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadOverview}
              disabled={loading || syncing || syncingOrg}
              className="p-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar cargo ou nível..."
              className="pl-10 h-10 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 font-medium rounded-xl transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleImport()}
              disabled={loading || syncing || syncingOrg || (!data?.totalRhidOnly && selectedKeys.size === 0)}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold text-xs"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1.5 text-indigo-600" />
              )}
              {selectedKeys.size > 0 ? `Puxar (${selectedKeys.size}) Selecionados` : 'Puxar Todos do RHiD'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Cargos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={
                      (filteredItems?.length ?? 0) > 0 &&
                      filteredItems?.every((i) => selectedKeys.has(i.key))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="p-3.5">Título do Cargo</th>
                <th className="p-3.5">Nível</th>
                <th className="p-3.5">Departamento Vinculado</th>
                <th className="p-3.5 text-center">Colaboradores</th>
                <th className="p-3.5">Status de Sincronização</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    Carregando cargos...
                  </td>
                </tr>
              ) : filteredItems && filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isSelected = selectedKeys.has(item.key);
                  return (
                    <tr
                      key={item.key}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.key)}
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 text-sm">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.level || 'Operacional'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {item.departmentName || '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {item.employeesCount}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {item.status === 'SYNCED' && (
                          <Badge variant="success" size="sm" className="font-semibold">
                            Sincronizado
                          </Badge>
                        )}
                        {item.status === 'RHID_ONLY' && (
                          <Badge variant="info" size="sm" className="font-semibold">
                            Apenas no RHiD
                          </Badge>
                        )}
                        {item.status === 'ATRIO_ONLY' && (
                          <Badge variant="warning" size="sm" className="font-semibold">
                            Apenas no Átrio
                          </Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {item.status === 'RHID_ONLY' ? (
                          <button
                            onClick={() => handleImport([item.rhidId!])}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline text-xs"
                          >
                            Importar para Átrio
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs inline-flex items-center justify-end">
                            <Check className="w-4 h-4 mr-1" />
                            Em dia
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    Nenhum cargo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
        type={feedback.type}
        title={feedback.title}
        description={feedback.description}
        metrics={feedback.metrics}
      />
    </div>
  );
};
