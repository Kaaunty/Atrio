import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  UserCheck,
  Search,
  CalendarPlus,
  Edit2,
  Upload,
  Calendar,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { api } from '../../services/api';
import { organizationService, Department } from '../../services/organizationService';

type ActiveTab = 'PERIODS' | 'ALERTS' | 'PENDING';

export const RhVacationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('PERIODS');

  // Dados gerais
  const [periods, setPeriods] = useState<any[]>([]);
  const [periodsSummary, setPeriodsSummary] = useState({
    totalPeriods: 0,
    acquiredOpenCount: 0,
    inAcquisitionCount: 0,
    expiringAlertCount: 0,
    scheduledRequestsCount: 0,
  });
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managersList, setManagersList] = useState<Array<{ id: string; name: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filtros da aba de Controle de Períodos
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');

  // Modal de Homologação (Solicitações Pendentes)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal de Programação Direta de Férias pelo RH
  const [schedulePeriod, setSchedulePeriod] = useState<any | null>(null);
  const [schedStartDate, setSchedStartDate] = useState('');
  const [schedEndDate, setSchedEndDate] = useState('');
  const [schedSellDays, setSchedSellDays] = useState(0);
  const [schedAdvance13, setSchedAdvance13] = useState(false);
  const [schedNotes, setSchedNotes] = useState('');
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);

  // Modal de Ajuste de Saldo / Período pelo RH
  const [editPeriod, setEditPeriod] = useState<any | null>(null);
  const [editEntitled, setEditEntitled] = useState(30);
  const [editTaken, setEditTaken] = useState(0);
  const [editRemaining, setEditRemaining] = useState(30);
  const [editDeadline, setEditDeadline] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal de Importação de Planilha Excel
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const depts = await organizationService.getDepartments();
        setDepartments(depts || []);
      } catch (err) {
        console.error('Erro ao carregar departamentos:', err);
      }
    };
    loadFilters();
  }, []);

  const fetchPeriods = async (page = meta.page, pageSize = meta.pageSize) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (departmentId) params.set('departmentId', departmentId);
      if (managerId) params.set('managerId', managerId);
      if (statusFilter) params.set('status', statusFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);

      const res = await api.get(`/vacations/rh/periods?${params.toString()}`);
      const data = res.data?.data;
      if (data) {
        setPeriods(data.items || []);
        setPeriodsSummary(
          data.summary || {
            totalPeriods: 0,
            acquiredOpenCount: 0,
            inAcquisitionCount: 0,
            expiringAlertCount: 0,
            scheduledRequestsCount: 0,
          }
        );
        if (data.meta) setMeta(data.meta);

        // Extrai lista única de gestores encontrados para popular o filtro de líderes
        const mgrMap = new Map<string, string>();
        for (const item of data.items || []) {
          if (item.employee?.manager?.id && item.employee?.manager?.name) {
            mgrMap.set(item.employee.manager.id, item.employee.manager.name);
          }
        }
        if (mgrMap.size > 0 && managersList.length === 0) {
          setManagersList(
            Array.from(mgrMap.entries())
              .map(([id, name]) => ({ id, name }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      }
    } catch (err) {
      console.error('Erro ao carregar períodos de férias:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRhQueues = async () => {
    try {
      const [alertRes, pendRes] = await Promise.all([
        api.get('/vacations/rh/expiring-alerts'),
        api.get('/vacations/rh/pending'),
      ]);
      setAlerts(alertRes.data.data || []);
      setPendingRequests(pendRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar filas de férias do RH:', err);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchPeriods(meta.page, meta.pageSize), fetchRhQueues()]);
  };

  useEffect(() => {
    fetchRhQueues();
  }, []);

  useEffect(() => {
    fetchPeriods(1, meta.pageSize);
  }, [debouncedSearch, departmentId, managerId, statusFilter, urgencyFilter]);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await api.post('/vacations/rh/sync', {});
      await refreshAll();
    } catch (err) {
      console.error('Erro ao sincronizar períodos:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartmentId('');
    setManagerId('');
    setStatusFilter('');
    setUrgencyFilter('');
  };

  // Homologação de solicitação existente
  const handleOpenAction = (req: any, type: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setActionType(type);
    setReviewNotes(
      type === 'APPROVE'
        ? 'Homologado conforme parecer da chefia e conformidade CLT.'
        : ''
    );
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    if (!reviewNotes.trim()) {
      setActionError('O parecer do RH é obrigatório');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      if (actionType === 'APPROVE') {
        await api.post(`/vacations/requests/${selectedRequest.id}/rh-approve`, {
          notes: reviewNotes,
        });
      } else {
        await api.post(`/vacations/requests/${selectedRequest.id}/rh-reject`, {
          notes: reviewNotes,
        });
      }

      setSelectedRequest(null);
      setActionType(null);
      await refreshAll();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erro ao homologar férias');
    } finally {
      setActionLoading(false);
    }
  };

  // Programação direta de férias pelo RH
  const handleOpenSchedule = (period: any) => {
    setSchedulePeriod(period);
    setSchedStartDate('');
    setSchedEndDate('');
    setSchedSellDays(0);
    setSchedAdvance13(false);
    setSchedNotes('');
    setSchedError(null);
  };

  let schedCalculatedDays = 0;
  let schedReturnDateStr = '';
  if (schedStartDate && schedEndDate) {
    const s = new Date(`${schedStartDate}T12:00:00Z`);
    const e = new Date(`${schedEndDate}T12:00:00Z`);
    if (e >= s) {
      schedCalculatedDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const ret = new Date(e);
      ret.setUTCDate(ret.getUTCDate() + 1);
      schedReturnDateStr = ret.toISOString().split('T')[0];
    }
  }

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulePeriod || !schedStartDate || !schedEndDate) return;

    try {
      setSchedLoading(true);
      setSchedError(null);

      await api.post('/vacations/rh/schedule', {
        vacationPeriodId: schedulePeriod.id,
        startDate: schedStartDate,
        endDate: schedEndDate,
        sellDaysCount: Number(schedSellDays) || 0,
        advanceThirteenth: schedAdvance13,
        notes: schedNotes.trim() || 'Programação registrada pelo RH.',
        autoApprove: true,
      });

      setSchedulePeriod(null);
      await refreshAll();
    } catch (err: any) {
      setSchedError(err.response?.data?.message || 'Erro ao programar férias');
    } finally {
      setSchedLoading(false);
    }
  };

  // Ajuste de saldo / período pelo RH
  const handleOpenEditPeriod = (period: any) => {
    setEditPeriod(period);
    setEditEntitled(period.daysEntitled);
    setEditTaken(period.daysTaken);
    setEditRemaining(period.daysRemaining);
    setEditDeadline(period.deadlineDate ? period.deadlineDate.split('T')[0] : '');
    setEditError(null);
  };

  const handleConfirmEditPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPeriod) return;

    try {
      setEditLoading(true);
      setEditError(null);

      await api.patch(`/vacations/rh/periods/${editPeriod.id}`, {
        daysEntitled: Number(editEntitled),
        daysTaken: Number(editTaken),
        daysRemaining: Number(editRemaining),
        deadlineDate: editDeadline || undefined,
      });

      setEditPeriod(null);
      await refreshAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Erro ao ajustar período aquisitivo');
    } finally {
      setEditLoading(false);
    }
  };

  // Importação de planilha Excel
  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Selecione um arquivo Excel (.xlsx)');
      return;
    }

    try {
      setImportLoading(true);
      setImportError(null);

      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/vacations/rh/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(res.data.data);
      await refreshAll();
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Erro ao importar planilha de férias');
    } finally {
      setImportLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CL';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getUrgencyBadge = (urgency: string, daysUntil: number, status?: string) => {
    if (status === 'CONCLUIDO') {
      return <Badge variant="neutral" size="sm">Quitado</Badge>;
    }
    if (status === 'EM_AQUISICAO') {
      return <Badge variant="teal" size="sm" dot>Em Aquisição</Badge>;
    }
    if (urgency === 'VENCIDO') {
      return <Badge variant="danger" size="sm" dot>Vencido</Badge>;
    }
    if (urgency === 'CRITICO') {
      return <Badge variant="danger" size="sm" dot>Crítico ({daysUntil}d)</Badge>;
    }
    if (urgency === 'ALERTA') {
      return <Badge variant="warning" size="sm" dot>Alerta ({daysUntil}d)</Badge>;
    }
    return <Badge variant="success" size="sm" dot>Adquirido</Badge>;
  };

  const getPeriodStatusBadge = (status: string) => {
    switch (status) {
      case 'ADQUIRIDO':
        return <Badge variant="success" size="sm" dot>Adquirido</Badge>;
      case 'EM_AQUISICAO':
        return <Badge variant="teal" size="sm" dot>Em Aquisição</Badge>;
      case 'VENCIDO':
        return <Badge variant="danger" size="sm" dot>Vencido</Badge>;
      case 'CONCLUIDO':
        return <Badge variant="neutral" size="sm">Concluído</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Pronto para Homologação</Badge>;
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Com Gestor</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <AppLayout
      title="Controle de Férias (RH)"
      subtitle="Acompanhamento automático de períodos aquisitivos, limites concessivos, saldos proporcionais e programação de férias"
    >
      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          className="p-4 flex items-center gap-3.5 bg-white border-atrio-border cursor-pointer hover:border-emerald-300 transition-colors"
          onClick={() => {
            setActiveTab('PERIODS');
            setStatusFilter('ADQUIRIDO');
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Períodos Adquiridos</p>
            <h4 className="text-xl font-bold text-emerald-700">
              {periodsSummary.acquiredOpenCount}{' '}
              <span className="text-xs font-normal text-slate-400">com saldo</span>
            </h4>
          </div>
        </Card>

        <Card
          className="p-4 flex items-center gap-3.5 bg-white border-atrio-border cursor-pointer hover:border-teal-300 transition-colors"
          onClick={() => {
            setActiveTab('PERIODS');
            setStatusFilter('EM_AQUISICAO');
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0 border border-teal-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Em Aquisição</p>
            <h4 className="text-xl font-bold text-teal-700">
              {periodsSummary.inAcquisitionCount}{' '}
              <span className="text-xs font-normal text-slate-400">ciclos ativos</span>
            </h4>
          </div>
        </Card>

        <Card
          className="p-4 flex items-center gap-3.5 bg-white border-atrio-border cursor-pointer hover:border-rose-300 transition-colors"
          onClick={() => setActiveTab('ALERTS')}
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold shrink-0 border border-rose-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Próximos do Vencimento</p>
            <h4 className="text-xl font-bold text-rose-600">
              {alerts.length}{' '}
              <span className="text-xs font-normal text-slate-400">alertas (≤ 90d)</span>
            </h4>
          </div>
        </Card>

        <Card
          className="p-4 flex items-center gap-3.5 bg-white border-atrio-border cursor-pointer hover:border-amber-300 transition-colors"
          onClick={() => setActiveTab('PENDING')}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Fila de Homologação</p>
            <h4 className="text-xl font-bold text-amber-700">
              {pendingRequests.length}{' '}
              <span className="text-xs font-normal text-slate-400">solicitações</span>
            </h4>
          </div>
        </Card>
      </div>

      {/* Card Principal */}
      <Card className="p-5 space-y-5 bg-white border-atrio-border">
        {/* Abas + Botões de Ação no Topo */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('PERIODS')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'PERIODS'
                  ? 'bg-atrio-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Controle de Períodos e Saldos ({periodsSummary.totalPeriods})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALERTS'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Alertas de Vencimento ({alerts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-atrio-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Fila de Homologação ({pendingRequests.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className={`w-4 h-4 text-atrio-teal ${syncing ? 'animate-spin' : ''}`} />}
              onClick={handleSyncAll}
              disabled={syncing || loading}
              title="Recalcula automaticamente os períodos aquisitivos e concessivos a partir da data de admissão"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Períodos'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setImportError(null);
                setIsImportOpen(true);
              }}
            >
              Importar Planilha
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={refreshAll}
              disabled={loading}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* ABA 1: CONTROLE GERAL DE PERÍODOS E SALDOS */}
        {activeTab === 'PERIODS' && (
          <div className="space-y-4">
            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <Input
                  placeholder="Buscar por nome do colaborador, contrato ou matrícula..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {(search || departmentId || managerId || statusFilter || urgencyFilter) && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleClearFilters}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={[
                  { value: '', label: 'Todos os Setores' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />

              <Select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                options={[
                  { value: '', label: 'Todos os Líderes / Gestores' },
                  ...managersList.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos os Status de Período' },
                  { value: 'ADQUIRIDO', label: 'Adquirido (Pronto para Gozo)' },
                  { value: 'EM_AQUISICAO', label: 'Em Aquisição (Proporcional)' },
                  { value: 'VENCIDO', label: 'Vencido' },
                  { value: 'CONCLUIDO', label: 'Concluído / Quitado' },
                ]}
              />

              <Select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todas as Urgências de Prazo' },
                  { value: 'VENCIDO', label: 'Vencido (Prazo Expirado)' },
                  { value: 'CRITICO', label: 'Crítico (Vence em até 30 dias)' },
                  { value: 'ALERTA', label: 'Alerta (Vence em até 90 dias)' },
                  { value: 'NORMAL', label: 'No Prazo' },
                ]}
              />
            </div>

            {/* Tabela Centralizada no padrão visual Atrio (Sem overflow-x) */}
            <div className="w-full overflow-hidden rounded-lg border border-atrio-border">
              <table className="w-full table-fixed text-left text-sm text-atrio-text-primary">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
                  <tr>
                    <th className="py-3 px-4 w-[26%]">Colaborador</th>
                    <th className="py-3 px-3 w-[19%]">Setor & Liderança</th>
                    <th className="py-3 px-3 w-[14%]">Período Aquisitivo</th>
                    <th className="py-3 px-3 w-[12%]">Limite Concessivo</th>
                    <th className="py-3 px-3 w-[11%]">Saldo</th>
                    <th className="py-3 px-3 w-[11%]">Status</th>
                    <th className="py-3 px-4 w-[7%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atrio-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Carregando controle de férias...
                      </td>
                    </tr>
                  ) : periods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-sm">Nenhum período aquisitivo encontrado</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Ajuste os filtros acima para localizar os períodos desejados.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    periods.map((p: any) => {
                      const activeRequest = p.requests?.[0];
                      const isAcquisition = p.status === 'EM_AQUISICAO';
                      const contractCode = p.employee?.code || p.employee?.registrationNumber || '-';

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Colaborador com Avatar de Iniciais */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[11px] shrink-0 group-hover:border-atrio-teal transition-colors">
                                {getInitials(p.employee?.name)}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="font-semibold text-xs text-atrio-navy group-hover:text-atrio-teal-dark transition-colors truncate"
                                  title={p.employee?.name}
                                >
                                  {p.employee?.name}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                  Mat: {contractCode} • Adm: {formatDate(p.employee?.admissionDate)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Setor & Liderança */}
                          <td className="py-3 px-3">
                            <div className="min-w-0 text-xs">
                              <p
                                className="font-medium text-slate-700 truncate"
                                title={p.employee?.department?.name || 'Sem setor'}
                              >
                                {p.employee?.department?.name || 'Sem setor'}
                              </p>
                              {p.employee?.manager?.name ? (
                                <p
                                  className="text-[11px] text-blue-800/80 font-medium truncate"
                                  title={`Líder: ${p.employee.manager.name}`}
                                >
                                  Líder: {p.employee.manager.name}
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic truncate">
                                  Diretoria / Sem líder
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Período Aquisitivo */}
                          <td className="py-3 px-3">
                            <div className="text-xs font-mono">
                              <p className="font-medium text-slate-700">
                                {formatDate(p.vestingStartDate)}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                até {formatDate(p.vestingEndDate)}
                              </p>
                            </div>
                          </td>

                          {/* Limite Concessivo */}
                          <td className="py-3 px-3">
                            <div className="text-xs">
                              <p className="font-mono font-semibold text-slate-800">
                                {formatDate(p.deadlineDate)}
                              </p>
                              {!isAcquisition && p.daysRemaining > 0 ? (
                                <p
                                  className={`text-[11px] font-medium ${
                                    p.daysUntilDeadline <= 0
                                      ? 'text-rose-600'
                                      : p.daysUntilDeadline <= 90
                                      ? 'text-amber-600'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {p.daysUntilDeadline <= 0
                                    ? `Vencido há ${Math.abs(p.daysUntilDeadline)}d`
                                    : `Restam ${p.daysUntilDeadline} dias`}
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400">
                                  {isAcquisition ? 'Ciclo em curso' : 'Ciclo quitado'}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Saldo */}
                          <td className="py-3 px-3">
                            {isAcquisition ? (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/70 font-bold text-xs">
                                  {p.accruedDays}d prop.
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {p.monthsWorked}/12 avos
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs border ${
                                    p.daysRemaining > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {p.daysRemaining} dias
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Cedidos: {p.daysTaken}d
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Status & Situação */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div>
                                {!isAcquisition && p.daysRemaining > 0
                                  ? getUrgencyBadge(p.urgencyLevel, p.daysUntilDeadline, p.status)
                                  : getPeriodStatusBadge(p.status)}
                              </div>
                              {activeRequest ? (
                                <p
                                  className="text-[11px] text-blue-700 font-medium truncate"
                                  title={`Programadas: ${formatDate(activeRequest.startDate)} a ${formatDate(activeRequest.endDate)}`}
                                >
                                  {formatDate(activeRequest.startDate)} ({activeRequest.daysCount}d)
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 truncate">
                                  Não programadas
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Ações (Alinhadas como no Quadro de Colaboradores) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-0.5">
                              {p.daysRemaining > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Programar Férias"
                                  onClick={() => handleOpenSchedule(p)}
                                >
                                  <CalendarPlus className="w-4 h-4 text-atrio-teal-dark" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Ajustar Saldo ou Datas"
                                onClick={() => handleOpenEditPeriod(p)}
                              >
                                <Edit2 className="w-4 h-4 text-slate-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <p>
                  Mostrando <span className="font-semibold text-slate-700">{periods.length}</span> de{' '}
                  <span className="font-semibold text-slate-700">{meta.total}</span> períodos aquisitivos
                </p>
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                  <span>Exibir</span>
                  <select
                    value={meta.pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setMeta((prev) => ({ ...prev, pageSize: newSize }));
                      fetchPeriods(1, newSize);
                    }}
                    className="bg-white border border-atrio-border rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-atrio-teal cursor-pointer"
                  >
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={250}>250 por página</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => fetchPeriods(meta.page - 1, meta.pageSize)}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Anterior
                </Button>
                <span className="px-2 font-medium">
                  Página {meta.page} de {meta.totalPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => fetchPeriods(meta.page + 1, meta.pageSize)}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ALERTAS DE VENCIMENTO CONCESSIVO */}
        {activeTab === 'ALERTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Alertas de Vencimento Concessivo ({alerts.length})
                </h3>
                <p className="text-xs text-atrio-text-secondary">
                  Colaboradores com períodos aquisitivos que expiram em até 90 dias (risco de férias em dobro - CLT Art. 137).
                </p>
              </div>
            </div>

            {alerts.length > 0 ? (
              <div className="w-full overflow-hidden rounded-lg border border-atrio-border">
                <table className="w-full table-fixed text-left text-sm text-atrio-text-primary">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
                    <tr>
                      <th className="py-3 px-4 w-[28%]">Colaborador</th>
                      <th className="py-3 px-3 w-[20%]">Setor & Liderança</th>
                      <th className="py-3 px-3 w-[15%]">Período Aquisitivo</th>
                      <th className="py-3 px-3 w-[13%]">Limite Concessivo</th>
                      <th className="py-3 px-3 w-[10%]">Saldo</th>
                      <th className="py-3 px-3 w-[8%]">Urgência</th>
                      <th className="py-3 px-4 w-[6%] text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atrio-border">
                    {alerts.map((alt: any) => (
                      <tr key={alt.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center font-bold text-rose-700 text-[11px] shrink-0">
                              {getInitials(alt.employee?.name)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="font-semibold text-xs text-atrio-navy truncate"
                                title={alt.employee?.name}
                              >
                                {alt.employee?.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono truncate">
                                Mat: {alt.employee?.code || alt.employee?.registrationNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <p className="font-medium text-slate-700 truncate">
                            {alt.employee?.department?.name || 'Geral'}
                          </p>
                          <p className="text-[11px] text-blue-800/80 font-medium truncate">
                            Líder: {alt.employee?.manager?.name || 'Diretoria'}
                          </p>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          <p className="font-medium text-slate-700">
                            {formatDate(alt.vestingStartDate)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            até {formatDate(alt.vestingEndDate)}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <p className="font-mono font-semibold text-slate-800">
                            {formatDate(alt.deadlineDate)}
                          </p>
                          <p className="text-[11px] text-rose-600 font-medium">
                            {alt.daysUntilDeadline <= 0
                              ? `Vencido há ${Math.abs(alt.daysUntilDeadline)}d`
                              : `Restam ${alt.daysUntilDeadline} dias`}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/70 font-bold text-xs">
                            {alt.daysRemaining} dias
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {getUrgencyBadge(alt.urgencyLevel, alt.daysUntilDeadline, alt.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Programar Férias"
                            onClick={() => handleOpenSchedule(alt)}
                          >
                            <CalendarPlus className="w-4 h-4 text-atrio-teal-dark" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Excelente! Nenhum colaborador com férias próximas do vencimento concessivo.
              </div>
            )}
          </div>
        )}

        {/* ABA 3: FILA CENTRAL DE HOMOLOGAÇÃO */}
        {activeTab === 'PENDING' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-atrio-teal" />
                Fila Central de Homologação de Férias ({pendingRequests.length})
              </h3>
              <p className="text-xs text-atrio-text-secondary">
                Solicitações com parecer da chefia imediata aguardando lançamento e homologação do RH.
              </p>
            </div>

            {pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <strong className="text-sm text-slate-800 font-bold">
                          {req.employee?.name}
                        </strong>
                        <span className="text-slate-400 font-mono">
                          Matrícula: {req.employee?.registrationNumber}
                        </span>
                        <span className="text-slate-500">
                          • {req.employee?.department?.name || 'Geral'}
                        </span>
                        {getStatusBadge(req.status)}
                      </div>

                      <div className="flex items-center gap-4 text-slate-600 font-medium">
                        <span>
                          Período:{' '}
                          <strong className="text-atrio-navy font-bold">
                            {formatDate(req.startDate)} a {formatDate(req.endDate)}
                          </strong>
                        </span>
                        <span>({req.daysCount} dias de férias)</span>
                        {req.sellDaysCount > 0 && <span>+ {req.sellDaysCount} dias de abono</span>}
                        {req.advanceThirteenth && (
                          <span className="text-indigo-600 font-bold">• 13º Adiantado</span>
                        )}
                      </div>

                      {req.managerNotes && (
                        <p className="text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Parecer do Gestor ({req.manager?.name || 'Gestor'}):</strong>{' '}
                            {req.managerNotes}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<XCircle className="w-4 h-4 text-rose-500" />}
                        onClick={() => handleOpenAction(req, 'REJECT')}
                        className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                      >
                        Rejeitar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleOpenAction(req, 'APPROVE')}
                      >
                        Homologar Férias
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma solicitação de férias aguardando homologação no momento.
              </div>
            )}
          </div>
        )}
      </Card>

        {/* MODAL 1: Programar Férias diretamente pelo RH */}
        <Modal
          isOpen={Boolean(schedulePeriod)}
          onClose={() => setSchedulePeriod(null)}
          title="Programar Férias do Colaborador (RH)"
          subtitle="Registre o agendamento de férias diretamente no período aquisitivo selecionado"
          maxWidth="md"
        >
          {schedulePeriod && (
            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              {schedError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{schedError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Colaborador:</strong> {schedulePeriod.employee?.name} (
                  {schedulePeriod.employee?.department?.name || 'Sem setor'})
                </p>
                <p>
                  <strong>Período Aquisitivo:</strong>{' '}
                  {formatDate(schedulePeriod.vestingStartDate)} a{' '}
                  {formatDate(schedulePeriod.vestingEndDate)}
                </p>
                <p>
                  <strong>Data Limite Gozo:</strong> {formatDate(schedulePeriod.deadlineDate)} •{' '}
                  <strong>Saldo Disponível:</strong>{' '}
                  <span className="text-emerald-700 font-bold">
                    {schedulePeriod.daysRemaining} dias
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Início Férias Programadas *
                  </label>
                  <input
                    type="date"
                    value={schedStartDate}
                    onChange={(e) => setSchedStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Fim Férias Programadas *
                  </label>
                  <input
                    type="date"
                    value={schedEndDate}
                    min={schedStartDate}
                    onChange={(e) => setSchedEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>
              </div>

              {schedCalculatedDays > 0 && (
                <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-center justify-between">
                  <span>
                    <strong>Dias de Gozo:</strong> {schedCalculatedDays} dias corridos
                  </span>
                  <span>
                    <strong>Data de Retorno:</strong> {formatDate(schedReturnDateStr)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Abono Pecuniário (Dias Vendidos)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={schedSellDays}
                    onChange={(e) => setSchedSellDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedAdvance13}
                    onChange={(e) => setSchedAdvance13(e.target.checked)}
                    className="rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal"
                  />
                  Adiantamento da 1ª parcela do 13º
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Observações da Programação
                </label>
                <textarea
                  value={schedNotes}
                  onChange={(e) => setSchedNotes(e.target.value)}
                  placeholder="Observações internas do RH..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setSchedulePeriod(null)}
                  disabled={schedLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={schedLoading || schedCalculatedDays <= 0}
                >
                  {schedLoading ? 'Salvando...' : 'Confirmar Programação'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* MODAL 2: Ajustar Saldo / Período Aquisitivo */}
        <Modal
          isOpen={Boolean(editPeriod)}
          onClose={() => setEditPeriod(null)}
          title="Ajustar Período Aquisitivo e Saldo"
          subtitle="Atualize dias de direito, dias já cedidos ou data limite de gozo"
          maxWidth="md"
        >
          {editPeriod && (
            <form onSubmit={handleConfirmEditPeriod} className="space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Colaborador:</strong> {editPeriod.employee?.name}
                </p>
                <p>
                  <strong>Período Aquisitivo:</strong> {formatDate(editPeriod.vestingStartDate)} a{' '}
                  {formatDate(editPeriod.vestingEndDate)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Dias de Direito
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editEntitled}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditEntitled(val);
                      setEditRemaining(Math.max(0, val - editTaken - (editPeriod.daysScheduled || 0)));
                    }}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Dias Cedidos
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editTaken}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditTaken(val);
                      setEditRemaining(Math.max(0, editEntitled - val - (editPeriod.daysScheduled || 0)));
                    }}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Saldo Disponível
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editRemaining}
                    onChange={(e) => setEditRemaining(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Data Limite de Gozo (Concessivo)
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setEditPeriod(null)}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={editLoading}>
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* MODAL 3: Importação de Planilha Excel */}
        <Modal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          title="Importar Planilha de Controle de Férias (.xlsx)"
          subtitle="Sincronize períodos aquisitivos, saldos, setores e lideranças diretamente da planilha do RH"
          maxWidth="md"
        >
          <form onSubmit={handleConfirmImport} className="space-y-4">
            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                <p className="font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Planilha importada com sucesso!
                </p>
                <ul className="space-y-1 pl-5 list-disc">
                  <li>Linhas processadas: <strong>{importResult.totalRowsProcessed}</strong></li>
                  <li>Períodos criados: <strong>{importResult.periodsCreated}</strong></li>
                  <li>Períodos atualizados: <strong>{importResult.periodsUpdated}</strong></li>
                  <li>Colaboradores atualizados: <strong>{importResult.employeesUpdated}</strong></li>
                  <li>Novos colaboradores/líderes cadastrados: <strong>{importResult.employeesCreated}</strong></li>
                  <li>Lideranças vinculadas: <strong>{importResult.managersLinked}</strong></li>
                </ul>
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-600">
                    {importFile ? (
                      <strong className="text-atrio-navy">{importFile.name}</strong>
                    ) : (
                      'Selecione a planilha no padrão CONTROLE_FERIAS_SETORES_LIDERES (.xlsx)'
                    )}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Escolher Arquivo .xlsx
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    disabled={importLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={importLoading || !importFile}
                  >
                    {importLoading ? 'Importando...' : 'Processar Planilha'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>

        {/* MODAL 4: Homologação de Solicitação */}
        <Modal
          isOpen={Boolean(selectedRequest && actionType)}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title={
            actionType === 'APPROVE'
              ? 'Homologar e Agendar Férias (RH)'
              : 'Rejeitar Solicitação de Férias'
          }
          maxWidth="md"
        >
          {selectedRequest && (
            <form onSubmit={handleConfirmAction} className="space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Colaborador:</strong> {selectedRequest.employee?.name} (
                  {selectedRequest.employee?.department?.name})
                </p>
                <p>
                  <strong>Período:</strong> {formatDate(selectedRequest.startDate)} a{' '}
                  {formatDate(selectedRequest.endDate)} ({selectedRequest.daysCount} dias)
                </p>
                {selectedRequest.managerNotes && (
                  <p className="text-blue-700">
                    <strong>Parecer do Gestor:</strong> {selectedRequest.managerNotes}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Parecer da Homologação (RH) *
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Insira o despacho do RH para homologação e auditoria legal..."
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant={actionType === 'APPROVE' ? 'primary' : 'danger'}
                  size="sm"
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? 'Homologando...'
                    : actionType === 'APPROVE'
                    ? 'Confirmar Homologação'
                    : 'Confirmar Rejeição'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
    </AppLayout>
  );
};
