import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Sun,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Edit2,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmployeeModal } from '../../components/employees/EmployeeModal';
import {
  Employee,
  EmployeeStatus,
  ContractType,
  employeeService,
} from '../../services/employeeService';
import {
  organizationService,
  Company,
  Department,
  Position,
} from '../../services/organizationService';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();

  // Estados de dados
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    pageSize: 15,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Métricas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vacation: 0,
    leave: 0,
  });

  // Filtros
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('');
  const [contractType, setContractType] = useState<ContractType | ''>('');

  // Auxiliares de filtro
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Carrega opções de filtro uma vez
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [comps, depts, pos] = await Promise.all([
          organizationService.getCompanies(),
          organizationService.getDepartments(),
          organizationService.getPositions(),
        ]);
        setCompanies(comps.data || []);
        setDepartments(depts || []);
        setPositions(pos.data || []);
      } catch (err) {
        console.error('Erro ao carregar opções de filtro:', err);
      }
    };
    loadFilterOptions();
  }, []);

  // Carrega lista de colaboradores
  const loadEmployees = async (page = meta.page) => {
    try {
      setLoading(true);
      const res = await employeeService.getEmployees({
        search: search || undefined,
        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        status: status ? status : undefined,
        contractType: contractType ? contractType : undefined,
        page,
        pageSize: meta.pageSize,
      });

      setEmployees(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega estatísticas gerais
  const loadStats = async () => {
    try {
      const [allRes, activeRes, vacationRes, leaveRes] = await Promise.all([
        employeeService.getEmployees({ pageSize: 1 }),
        employeeService.getEmployees({ status: 'ATIVO', pageSize: 1 }),
        employeeService.getEmployees({ status: 'FERIAS', pageSize: 1 }),
        employeeService.getEmployees({ status: 'AFASTADO', pageSize: 1 }),
      ]);

      setStats({
        total: allRes.meta?.total || 0,
        active: activeRes.meta?.total || 0,
        vacation: vacationRes.meta?.total || 0,
        leave: leaveRes.meta?.total || 0,
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  useEffect(() => {
    loadEmployees(1);
    loadStats();
  }, [search, companyId, departmentId, positionId, status, contractType]);

  const handleClearFilters = () => {
    setSearch('');
    setCompanyId('');
    setDepartmentId('');
    setPositionId('');
    setStatus('');
    setContractType('');
  };

  const handleOpenCreate = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeService.deleteEmployee(employeeToDelete.id, 'Desligamento solicitado pelo RH');
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      loadEmployees(meta.page);
      loadStats();
    } catch (err) {
      console.error('Erro ao desligar colaborador:', err);
    }
  };

  const getStatusBadge = (st: EmployeeStatus) => {
    switch (st) {
      case 'ATIVO':
        return <Badge variant="success">Ativo</Badge>;
      case 'FERIAS':
        return <Badge variant="warning">Férias</Badge>;
      case 'AFASTADO':
        return <Badge variant="neutral">Afastado</Badge>;
      case 'DESLIGADO':
        return <Badge variant="danger">Desligado</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  const formatCpfSafe = (cpf: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  return (
    <AppLayout
      title="Quadro de Colaboradores"
      subtitle="Cadastro centralizado de colaboradores, dados contratuais, vínculos e histórico de carreira"
    >
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-atrio-navy flex items-center justify-center font-bold shrink-0 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total de Colaboradores</p>
            <h4 className="text-xl font-bold text-atrio-navy">{stats.total}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Colaboradores Ativos</p>
            <h4 className="text-xl font-bold text-emerald-700">{stats.active}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0 border border-amber-100">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Em Férias</p>
            <h4 className="text-xl font-bold text-amber-700">{stats.vacation}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center font-bold shrink-0 border border-orange-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Afastamentos</p>
            <h4 className="text-xl font-bold text-orange-700">{stats.leave}</h4>
          </div>
        </Card>
      </div>

      {/* Seção Principal de Conteúdo */}
      <Card className="p-5 space-y-5 bg-white border-atrio-border">
        {/* Barra de Ações do Topo */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 relative max-w-md">
            <Input
              placeholder="Buscar por nome, CPF, e-mail ou matrícula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(search || companyId || departmentId || positionId || status || contractType) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearFilters}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Limpar Filtros
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              icon={<Plus className="w-4 h-4" />}
            >
              Novo Colaborador
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={[
              { value: '', label: 'Todas as Empresas' },
              ...companies.map((c) => ({ value: c.id, label: c.tradeName })),
            ]}
          />

          <Select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={[
              { value: '', label: 'Todos os Setores' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />

          <Select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            options={[
              { value: '', label: 'Todos os Cargos' },
              ...positions.map((p) => ({ value: p.id, label: `${p.title} (${p.level})` })),
            ]}
          />

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as EmployeeStatus | '')}
            options={[
              { value: '', label: 'Todos os Status' },
              { value: 'ATIVO', label: 'Ativo' },
              { value: 'FERIAS', label: 'Em Férias' },
              { value: 'AFASTADO', label: 'Afastado' },
              { value: 'DESLIGADO', label: 'Desligado' },
            ]}
          />

          <Select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as ContractType | '')}
            options={[
              { value: '', label: 'Todos os Contratos' },
              { value: 'CLT', label: 'CLT' },
              { value: 'PJ', label: 'PJ' },
              { value: 'ESTAGIO', label: 'Estágio' },
              { value: 'APRENDIZ', label: 'Jovem Aprendiz' },
              { value: 'TEMPORARIO', label: 'Temporário' },
            ]}
          />
        </div>

        {/* Tabela de Colaboradores */}
        <div className="overflow-x-auto rounded-lg border border-atrio-border">
          <table className="w-full text-left text-sm text-atrio-text-primary">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
              <tr>
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Cargo / Função</th>
                <th className="py-3 px-4">Setor & Empresa</th>
                <th className="py-3 px-4">Gestor Imediato</th>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atrio-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Carregando colaboradores...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">Nenhum colaborador encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Ajuste os filtros ou cadastre um novo colaborador no botão acima.
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/colaboradores/${emp.id}`)}
                  >
                    {/* Colaborador */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden shrink-0 group-hover:border-atrio-teal transition-colors">
                          {emp.avatarUrl ? (
                            <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-atrio-navy group-hover:text-atrio-teal-dark transition-colors truncate">
                            {emp.name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono truncate">
                            Mat: {emp.registrationNumber} • CPF: {formatCpfSafe(emp.cpf)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Cargo */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {emp.position?.title || 'Sem cargo'}
                        </p>
                        {emp.position?.level && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Nível: {emp.position.level}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Setor & Empresa */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-0 text-xs">
                        <p className="font-medium text-slate-700 truncate">
                          {emp.department?.name || 'Sem setor'}
                        </p>
                        <p className="text-slate-400 truncate">
                          {emp.company?.tradeName}
                          {emp.unit ? ` (${emp.unit.name})` : ''}
                        </p>
                      </div>
                    </td>

                    {/* Gestor */}
                    <td className="py-3.5 px-4 text-xs">
                      {emp.manager ? (
                        <div className="min-w-0">
                          <p className="font-medium text-blue-800 truncate">{emp.manager.name}</p>
                          <p className="text-[11px] text-slate-400">Mat: {emp.manager.registrationNumber}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Diretoria / Sem gestor</span>
                      )}
                    </td>

                    {/* Contrato */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                        {emp.contractType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(emp.status)}</td>

                    {/* Ações */}
                    <td
                      className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Ver Ficha Completa"
                        onClick={() => navigate(`/colaboradores/${emp.id}`)}
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        title="Editar Colaborador"
                        onClick={() => handleOpenEdit(emp)}
                      >
                        <Edit2 className="w-4 h-4 text-atrio-teal-dark" />
                      </Button>

                      {emp.status !== 'DESLIGADO' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Desligar Colaborador"
                          onClick={() => handleOpenDelete(emp)}
                        >
                          <UserMinus className="w-4 h-4 text-rose-500" />
                        </Button>
                      )}
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
            Mostrando <span className="font-semibold text-slate-700">{employees.length}</span> de{' '}
            <span className="font-semibold text-slate-700">{meta.total}</span> colaboradores
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => loadEmployees(meta.page - 1)}
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
              onClick={() => loadEmployees(meta.page + 1)}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Admissão/Edição */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadEmployees(meta.page);
          loadStats();
        }}
        employee={selectedEmployee}
      />

      {/* Modal de Confirmação de Desligamento */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Desligamento do Colaborador"
        description={`Tem certeza que deseja desligar "${employeeToDelete?.name}"? Esta ação mudará o status para DESLIGADO e gerará um evento imutável na timeline histórica do colaborador.`}
        confirmText="Confirmar Desligamento"
        variant="danger"
      />
    </AppLayout>
  );
};
