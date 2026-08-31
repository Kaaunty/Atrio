import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Calendar,
  Clock,
  RotateCcw,
  Eye,
  FileCode,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { adminService, AuditLogItem } from '../../services/adminService';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal de Detalhes do Log (Diff)
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async (page = meta.page) => {
    try {
      setLoading(true);
      const res = await adminService.getAuditLogs({
        page,
        pageSize: meta.pageSize,
        search: search || undefined,
        action: action || undefined,
        entity: entity || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setLogs(res.items || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [search, action, entity, startDate, endDate]);

  const handleClearFilters = () => {
    setSearch('');
    setAction('');
    setEntity('');
    setStartDate('');
    setEndDate('');
  };

  const getActionBadge = (act: string) => {
    switch (act.toUpperCase()) {
      case 'CREATE':
        return <Badge variant="success">CREATE (Criação)</Badge>;
      case 'UPDATE':
        return <Badge variant="navy">UPDATE (Alteração)</Badge>;
      case 'DELETE':
        return <Badge variant="danger">DELETE (Exclusão)</Badge>;
      case 'LOGIN':
        return <Badge variant="neutral">LOGIN (Acesso)</Badge>;
      case 'APPROVE':
        return <Badge variant="success">APPROVE (Aprovação)</Badge>;
      case 'REJECT':
        return <Badge variant="danger">REJECT (Recusa)</Badge>;
      default:
        return <Badge variant="neutral">{act}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <AppLayout
      title="Trilha de Auditoria & Conformidade LGPD"
      subtitle="Rastreamento e auditoria imutável de todas as mutações, acessos e alterações efetuadas no sistema"
    >
      {/* Container Principal */}
      <Card className="p-5 space-y-5 bg-white border-atrio-border">
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 relative max-w-md">
            <Input
              placeholder="Buscar por e-mail, ID de registro ou termo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(search || action || entity || startDate || endDate) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Linha de Filtros Avançados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
          <Select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[
              { value: '', label: 'Todas as Ações' },
              { value: 'CREATE', label: 'CREATE (Criação)' },
              { value: 'UPDATE', label: 'UPDATE (Alteração)' },
              { value: 'DELETE', label: 'DELETE (Exclusão)' },
              { value: 'LOGIN', label: 'LOGIN (Acesso)' },
              { value: 'APPROVE', label: 'APPROVE (Aprovação)' },
              { value: 'REJECT', label: 'REJECT (Recusa)' },
            ]}
          />

          <Select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            options={[
              { value: '', label: 'Todas as Entidades' },
              { value: 'User', label: 'Usuário (User)' },
              { value: 'Employee', label: 'Colaborador (Employee)' },
              { value: 'Role', label: 'Perfil (Role)' },
              { value: 'Company', label: 'Empresa (Company)' },
              { value: 'Department', label: 'Setor (Department)' },
              { value: 'Position', label: 'Cargo (Position)' },
            ]}
          />

          <Input
            type="date"
            placeholder="Data Inicial"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          />

          <Input
            type="date"
            placeholder="Data Final"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>

        {/* Tabela de Logs de Auditoria */}
        <div className="overflow-x-auto rounded-lg border border-atrio-border">
          <table className="w-full text-left text-sm text-atrio-text-primary">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
              <tr>
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Usuário / Autor</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade Afetada</th>
                <th className="py-3 px-4">IP & Origem</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atrio-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Carregando trilha de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">Nenhum registro de auditoria encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      As mutações e logins do sistema ficarão registradas aqui automaticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Data */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>

                    {/* Autor */}
                    <td className="py-3.5 px-4 text-xs">
                      {log.user ? (
                        <div className="min-w-0">
                          <p className="font-semibold text-atrio-navy truncate">{log.user.email}</p>
                          {log.user.employee && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {log.user.employee.name} (Mat: {log.user.employee.registrationNumber})
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Ação do Sistema</span>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>

                    {/* Entidade */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800">{log.entity}</span>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          ID: {log.recordId}
                        </p>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </td>

                    {/* Ação / Inspecionar */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        icon={<Eye className="w-3.5 h-3.5 text-atrio-teal" />}
                      >
                        Inspecionar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-500">
          <p>
            Mostrando <span className="font-semibold text-slate-700">{logs.length}</span> de{' '}
            <span className="font-semibold text-slate-700">{meta.total}</span> eventos registrados
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => loadLogs(meta.page - 1)}
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
              onClick={() => loadLogs(meta.page + 1)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Inspeção do Evento (Diff View) */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Inspeção de Auditoria: ${selectedLog?.action} em ${selectedLog?.entity}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Metadados do Evento */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Data & Horário
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatDate(selectedLog.createdAt)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Autor / Usuário
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.user?.email || 'Sistema'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Endereço IP
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedLog.ipAddress || '127.0.0.1'}
                </span>
              </div>

              <div className="sm:col-span-3">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Identificador do Registro (PK)
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedLog.recordId}
                </span>
              </div>
            </div>

            {/* Comparativo de Alteração (Diff View) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <FileCode className="w-4 h-4 text-atrio-teal" />
                Comparativo de Alteração (Payload Antes vs Depois)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Antes */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-slate-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Estado Anterior (Previous)
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-[11px] font-mono max-h-60">
                    {selectedLog.previousValue
                      ? JSON.stringify(selectedLog.previousValue, null, 2)
                      : 'null (Nenhum dado anterior / Registro novo)'}
                  </pre>
                </div>

                {/* Depois */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-slate-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Novo Estado (New)
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-[11px] font-mono max-h-60">
                    {selectedLog.newValue
                      ? JSON.stringify(selectedLog.newValue, null, 2)
                      : 'null (Registro removido)'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex justify-end pt-3 border-t border-atrio-border">
              <Button
                variant="secondary"
                onClick={() => setSelectedLog(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};
