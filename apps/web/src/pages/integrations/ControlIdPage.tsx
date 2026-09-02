import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs, TabItem } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DeviceModal } from '../../components/integrations/DeviceModal';
import { ManualSyncModal } from '../../components/integrations/ManualSyncModal';
import { AfdUploadModal } from '../../components/integrations/AfdUploadModal';
import { RhidSettingsModal } from '../../components/integrations/RhidSettingsModal';
import { RhidEmployeeSyncTab } from '../../components/integrations/RhidEmployeeSyncTab';
import {
  IntegrationConfigItem,
  TimeClockDeviceItem,
  TimeClockSyncLogItem,
  TimeClockEntryItem,
  TestConnectionResult,
  integrationService,
} from '../../services/integrationService';
import { FeedbackDialog, FeedbackMetric } from '../../components/ui/FeedbackDialog';
import {
  Cpu,
  RefreshCw,
  Plus,
  FileUp,
  ChevronLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  Trash2,
  Edit2,
  Radio,
  Shield,
  Cloud,
  Users,
} from 'lucide-react';

export const ControlIdPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const [integration, setIntegration] = useState<(IntegrationConfigItem & { devices: TimeClockDeviceItem[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Modais
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<TimeClockDeviceItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAfdModalOpen, setIsAfdModalOpen] = useState(false);
  const [isRhidModalOpen, setIsRhidModalOpen] = useState(false);

  // Dispositivo para exclusão
  const [deviceToDelete, setDeviceToDelete] = useState<TimeClockDeviceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Teste de conexão do relógio
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ deviceName: string; res: TestConnectionResult } | null>(null);

  // Aba Logs
  const [logs, setLogs] = useState<TimeClockSyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TimeClockSyncLogItem | null>(null);

  // Aba Registros Brutos
  const [entries, setEntries] = useState<TimeClockEntryItem[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesSearch, setEntriesSearch] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getIntegration('control_id');
      setIntegration(data);
    } catch (err: any) {
      console.error('Falha ao carregar integração Control iD:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const res = await integrationService.getSyncLogs({
        integrationId: integration?.id,
        page,
        pageSize: 15,
      });
      setLogs(res.items);
    } catch (err) {
      console.error('Falha ao carregar logs de sync:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadEntries = async (page = 1) => {
    try {
      setEntriesLoading(true);
      const res = await integrationService.getEntries({
        search: entriesSearch || undefined,
        page,
        pageSize: 15,
      });
      setEntries(res.items);
    } catch (err) {
      console.error('Falha ao carregar marcações brutas:', err);
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs' && integration) {
      loadLogs();
    } else if (activeTab === 'entries') {
      loadEntries();
    }
  }, [activeTab, integration]);

  const handleToggle = async () => {
    if (!integration) return;
    try {
      setToggling(true);
      const updated = await integrationService.toggleIntegration('control_id', !integration.enabled);
      setIntegration((prev) => (prev ? { ...prev, enabled: updated.enabled, status: updated.status } : null));
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Alterar Status',
        description: err.response?.data?.message || 'Falha ao alterar status da integração.',
      });
    } finally {
      setToggling(false);
    }
  };

  const handleTestConnection = async (device: TimeClockDeviceItem) => {
    try {
      setTestingDeviceId(device.id);
      const res = await integrationService.testDeviceConnection(device.id);
      setTestResult({ deviceName: device.name, res });
    } catch (err: any) {
      setTestResult({
        deviceName: device.name,
        res: { success: false, message: err.response?.data?.message || 'Falha ao conectar no dispositivo' },
      });
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      setDeleting(true);
      await integrationService.deleteDevice(deviceToDelete.id);
      setDeviceToDelete(null);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Relógio Removido',
        description: `O relógio '${deviceToDelete.name}' foi removido com sucesso.`,
      });
      loadData();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Excluir',
        description: err.response?.data?.message || 'Falha ao excluir relógio.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const [syncingDevices, setSyncingDevices] = useState(false);

  const handleSyncDevicesFromRhid = async () => {
    try {
      setSyncingDevices(true);
      const res = await integrationService.syncRhidDevices();
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Relógios Físicos Sincronizados!',
        description: res.message,
        metrics: [
          { label: 'Total Encontrados', value: res.total, icon: <Radio className="w-5 h-5" /> },
          { label: 'Novos Cadastrados', value: res.createdCount, icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Atualizados', value: res.updatedCount, icon: <RefreshCw className="w-5 h-5" /> },
        ],
      });
      await loadData();
    } catch (err: any) {
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Falha ao Sincronizar Relógios',
        description: err.response?.data?.message || err.message || 'Falha ao sincronizar relógios do RHiD.',
      });
    } finally {
      setSyncingDevices(false);
    }
  };

  const copyToClipboard = (text: string, type: 'hash' | 'webhook') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(null), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const webhookUrl = `${window.location.origin}/api/v1/integrations/control-id/webhook`;

  const tabs: TabItem[] = [
    {
      id: 'devices',
      label: 'Relógios Cadastrados',
      badge: integration?.devices?.length || 0,
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'employees',
      label: 'Colaboradores & RHiD',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'logs',
      label: 'Histórico de Sincronizações',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'entries',
      label: 'Registros Brutos (Portaria 671)',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Configuração & Webhook',
      icon: <Radio className="w-4 h-4" />,
    },
  ];

  return (
    <AppLayout
      title="Integração Control iD"
      subtitle="Sincronização biométrica, importação de AFD e comunicação com relógios REP"
    >
      <div className="space-y-6">
        {/* Breadcrumb de Navegação */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/admin/integracoes" className="hover:text-atrio-teal transition-colors flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Hub de Integrações
          </Link>
          <span>/</span>
          <span className="text-atrio-text-primary">Control iD</span>
        </div>

        {/* Header Principal do Provedor com Master Switch e Botões de Ação */}
        <div className="bg-white rounded-2xl p-6 border border-atrio-border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-atrio-teal-light/50 border border-atrio-teal/30 text-atrio-teal flex items-center justify-center shrink-0">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-atrio-text-primary tracking-tight">
                  Control iD (iDClass / iDFit / iDAccess)
                </h2>
                {integration?.enabled ? (
                  <Badge variant="success" size="md">
                    Integração Ativa
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="md">
                    Desativada
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Módulo oficial de captura e auditoria de batidas de ponto físicas e virtuais homologadas pela Portaria
                671 do MTP.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Switch Master de Ativação */}
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                {integration?.enabled ? 'Integração Ligada' : 'Integração Desligada'}
              </span>
              <button
                type="button"
                onClick={handleToggle}
                disabled={toggling}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  integration?.enabled ? 'bg-atrio-teal' : 'bg-slate-300'
                } ${toggling ? 'opacity-60 cursor-wait' : ''}`}
                title="Ativar/Desativar integração"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    integration?.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Ações Rápidas */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsAfdModalOpen(true)}
              icon={<FileUp className="w-4 h-4 text-slate-600" />}
              disabled={!integration?.enabled}
            >
              Importar AFD
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsSyncModalOpen(true)}
              icon={<RefreshCw className="w-4 h-4 text-indigo-600" />}
              disabled={!integration?.enabled}
            >
              Sincronizar Ponto
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setEditingDevice(null);
                setIsDeviceModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Novo Relógio
            </Button>
          </div>
        </div>

        {/* Sistema de Abas */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* ========================================================================= */}
        {/* ABA 1: DISPOSITIVOS & RELÓGIOS */}
        {/* ========================================================================= */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Relógios Físicos de Ponto</h3>
                <p className="text-xs text-slate-500">Equipamentos biométricos e faciais conectados na rede local</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncDevicesFromRhid}
                disabled={syncingDevices || !integration?.enabled}
                icon={<RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncingDevices ? 'animate-spin' : ''}`} />}
              >
                {syncingDevices ? 'Buscando no RHiD...' : 'Buscar Relógios no RHiD'}
              </Button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400">Carregando dispositivos...</div>
            ) : !integration?.devices || integration.devices.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Cpu className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-atrio-text-primary">Nenhum relógio cadastrado</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Cadastre o endereço IP e número de série dos relógios Control iD da sua empresa para iniciar a coleta
                  automática de ponto.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingDevice(null);
                    setIsDeviceModalOpen(true);
                  }}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Cadastrar Primeiro Relógio
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integration.devices.map((dev) => (
                  <Card key={dev.id} className="p-5 border border-slate-200 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-atrio-text-primary text-sm">{dev.name}</h4>
                        <span className="text-[11px] text-slate-500 font-mono">Serial: {dev.serialNumber}</span>
                      </div>
                      {dev.active ? (
                        <Badge variant="success" size="sm">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Inativo
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Modelo:</span>
                        <span className="font-semibold text-slate-700">{dev.model}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Endereço IP:</span>
                        <span className="font-mono text-slate-700">
                          {dev.ipAddress ? `${dev.ipAddress}:${dev.port || 80}` : 'Via Nuvem / AFD'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Unidade / Filial:</span>
                        <span className="font-medium text-slate-700">{dev.unit?.name || 'Geral (Sem filial)'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Último Sync:</span>
                        <span className="text-slate-700">
                          {dev.lastSyncAt
                            ? new Date(dev.lastSyncAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Nunca'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestConnection(dev)}
                        disabled={testingDeviceId === dev.id}
                        icon={<Activity className="w-3.5 h-3.5 text-atrio-teal" />}
                      >
                        {testingDeviceId === dev.id ? 'Testando...' : 'Testar Comunicação'}
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDevice(dev);
                            setIsDeviceModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar Relógio"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeviceToDelete(dev)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Relógio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: COLABORADORES & RHID */}
        {/* ========================================================================= */}
        {activeTab === 'employees' && (
          <RhidEmployeeSyncTab onOpenSettings={() => setIsRhidModalOpen(true)} />
        )}

        {/* ========================================================================= */}
        {/* ABA 3: HISTÓRICO DE LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-atrio-text-primary uppercase tracking-wider">
                Auditoria de Execução de Sincronizações
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadLogs()}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />}
              >
                Recarregar Logs
              </Button>
            </div>

            <Card className="overflow-hidden border border-atrio-border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-atrio-border text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Data / Hora</th>
                      <th className="px-4 py-3">Dispositivo / Origem</th>
                      <th className="px-4 py-3">Disparador</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Lidas</th>
                      <th className="px-4 py-3 text-right">Novas</th>
                      <th className="px-4 py-3 text-right">Ignoradas</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Carregando logs de sincronização...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          Nenhum registro de sincronização encontrado.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">
                            {new Date(log.startedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-atrio-text-primary">
                            {log.device?.name || 'Todos os Relógios / Multi-Device'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {log.triggeredBy}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {log.status === 'SUCCESS' && (
                              <Badge variant="success" size="sm">
                                Sucesso
                              </Badge>
                            )}
                            {log.status === 'PARTIAL_SUCCESS' && (
                              <Badge variant="warning" size="sm">
                                Parcial
                              </Badge>
                            )}
                            {log.status === 'FAILED' && (
                              <Badge variant="danger" size="sm">
                                Falha
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                            {log.totalRecords}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            +{log.importedRecords}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{log.ignoredRecords}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="secondary" size="sm" onClick={() => setSelectedLog(log)}>
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: REGISTROS BRUTOS IMUTÁVEIS (TIME CLOCK ENTRIES) */}
        {/* ========================================================================= */}
        {activeTab === 'entries' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-80">
                <Input
                  placeholder="Buscar por colaborador, matrícula ou hash..."
                  value={entriesSearch}
                  onChange={(e) => setEntriesSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadEntries(1)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadEntries(1)}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${entriesLoading ? 'animate-spin' : ''}`} />}
                >
                  Filtrar
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border border-atrio-border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-atrio-border text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Data e Hora Exata</th>
                      <th className="px-4 py-3">Colaborador Vinculado</th>
                      <th className="px-4 py-3">Matrícula no REP</th>
                      <th className="px-4 py-3">Dispositivo / Origem</th>
                      <th className="px-4 py-3">NSR</th>
                      <th className="px-4 py-3">Hash SHA-256 (Idempotência)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entriesLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Carregando batidas originais...
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Nenhuma marcação bruta encontrada. Dispare uma sincronização ou importe um arquivo AFD.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-atrio-text-primary whitespace-nowrap">
                            {new Date(entry.timestamp).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {entry.employee ? (
                              <Link
                                to={`/colaboradores/${entry.employee.id}`}
                                className="font-semibold text-atrio-teal hover:underline flex items-center gap-1.5"
                              >
                                <span>{entry.employee.name}</span>
                              </Link>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Matrícula não vinculada
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700 font-semibold">
                            {entry.registrationNumber}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {entry.device?.name || entry.source}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{entry.nsr || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={entry.hash}>
                                {entry.hash}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(entry.hash, 'hash')}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                title="Copiar Hash"
                              >
                                {copiedHash === entry.hash ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 4: CONFIGURAÇÃO & WEBHOOK */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cloud className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-atrio-text-primary">RHiD Cloud (Control iD API v2)</h3>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRhidModalOpen(true)}
                  icon={<Cloud className="w-3.5 h-3.5" />}
                >
                  Configurar Acesso
                </Button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Integração direta com o portal oficial RHiD na nuvem. Permite o cadastro e sincronização de colaboradores com todos os relógios da conta, apuração do espelho de ponto e coleta automática de marcações.
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status da Conta RHiD:</span>
                <span className="font-semibold text-emerald-600 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Pronto para Sincronizar
                </span>
              </div>
            </Card>

            <Card className="p-6 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-atrio-teal" />
                <h3 className="text-base font-bold text-atrio-text-primary">URL de Push / Webhook Control iD</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Configure esta URL no painel Web do seu relógio Control iD (em <em>Configurações &gt; Notificações Push &gt; Servidor Web</em>). O relógio enviará cada batida em tempo real instantaneamente para o Átrio.
              </p>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Endpoint Webhook do Sistema</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="block w-full rounded-lg border border-atrio-border bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 select-all"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                    icon={copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedWebhook ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-atrio-teal" />
                <h3 className="text-base font-bold text-atrio-text-primary">Conformidade Legal & Idempotência</h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Imutabilidade Garantida:</strong> Os registros salvos em <code>TimeClockEntry</code> nunca sofrem
                    edição ou exclusão.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Anti-Duplicação:</strong> Toda marcação gera uma assinatura criptográfica SHA-256 única.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Portaria 671 MTP:</strong> Compatível com exportações fiscais oficiais AFD/AFDR.
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Modais */}
      <RhidSettingsModal
        isOpen={isRhidModalOpen}
        onClose={() => setIsRhidModalOpen(false)}
        onSaved={loadData}
      />

      <DeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        onSuccess={loadData}
        device={editingDevice}
      />

      <ManualSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={() => {
          loadData();
          if (activeTab === 'logs') loadLogs();
          if (activeTab === 'entries') loadEntries();
        }}
        devices={integration?.devices || []}
      />

      <AfdUploadModal
        isOpen={isAfdModalOpen}
        onClose={() => setIsAfdModalOpen(false)}
        onSuccess={() => {
          loadData();
          if (activeTab === 'logs') loadLogs();
          if (activeTab === 'entries') loadEntries();
        }}
        devices={integration?.devices || []}
      />

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Detalhes da Execução de Sincronização"
          subtitle={`Log ID: ${selectedLog.id}`}
          maxWidth="md"
          footer={<Button variant="primary" onClick={() => setSelectedLog(null)}>Fechar</Button>}
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="text-slate-400">Início:</span>
                <p className="font-mono font-medium text-slate-700">{new Date(selectedLog.startedAt).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <span className="text-slate-400">Fim:</span>
                <p className="font-mono font-medium text-slate-700">{selectedLog.finishedAt ? new Date(selectedLog.finishedAt).toLocaleString('pt-BR') : '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 border rounded bg-white">
                <span className="text-slate-400 block font-semibold">Total</span>
                <span className="text-sm font-bold text-slate-800">{selectedLog.totalRecords}</span>
              </div>
              <div className="p-2 border rounded bg-emerald-50 text-emerald-800">
                <span className="block font-semibold">Novas</span>
                <span className="text-sm font-bold">{selectedLog.importedRecords}</span>
              </div>
              <div className="p-2 border rounded bg-slate-100 text-slate-700">
                <span className="block font-semibold">Duplicadas</span>
                <span className="text-sm font-bold">{selectedLog.ignoredRecords}</span>
              </div>
            </div>

            {selectedLog.errorDetails && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                <pre>{JSON.stringify(selectedLog.errorDetails, null, 2)}</pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Resultado Teste de Conexão */}
      {testResult && (
        <Modal
          isOpen={!!testResult}
          onClose={() => setTestResult(null)}
          title={`Telemetria: ${testResult.deviceName}`}
          maxWidth="md"
          footer={<Button variant="primary" onClick={() => setTestResult(null)}>OK</Button>}
        >
          <div className="space-y-3 text-xs">
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
              testResult.res.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {testResult.res.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              <p className="font-semibold">{testResult.res.message}</p>
            </div>

            {testResult.res.details && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1">
                <p className="text-slate-400 font-bold mb-1">// Informações do Equipamento:</p>
                {Object.entries(testResult.res.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-atrio-teal font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deviceToDelete && (
        <ConfirmModal
          isOpen={!!deviceToDelete}
          onClose={() => setDeviceToDelete(null)}
          onConfirm={handleDeleteDevice}
          title="Remover Relógio de Ponto"
          description={`Tem certeza que deseja remover o relógio '${deviceToDelete.name}' (${deviceToDelete.serialNumber})? Os registros de ponto já importados permanecerão preservados no histórico.`}
          confirmText="Remover Equipamento"
          variant="danger"
          isLoading={deleting}
        />
      )}

      {/* Diálogo de Feedback & Resultados Elegante */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
        type={feedback.type}
        title={feedback.title}
        description={feedback.description}
        metrics={feedback.metrics}
      />
    </AppLayout>
  );
};
