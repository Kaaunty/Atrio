import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Briefcase,
  Users,
  Clock,
  Building2,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit2,
  UserMinus,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabItem } from '../../components/ui/Tabs';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmployeeModal } from '../../components/employees/EmployeeModal';
import { EmployeeTimeline } from '../../components/employees/EmployeeTimeline';
import { EmployeeSubordinates } from '../../components/employees/EmployeeSubordinates';
import {
  Employee,
  EmployeeHistory,
  EmployeeStatus,
  employeeService,
} from '../../services/employeeService';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [timeline, setTimeline] = useState<EmployeeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [empData, timelineData] = await Promise.all([
        employeeService.getEmployee(id),
        employeeService.getTimeline(id),
      ]);
      setEmployee(empData);
      setTimeline(timelineData || []);
    } catch (err) {
      console.error('Erro ao carregar detalhes do colaborador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleConfirmDelete = async () => {
    if (!id) return;
    try {
      await employeeService.deleteEmployee(id, 'Desligamento realizado via ficha do colaborador');
      setIsDeleteModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Erro ao desligar colaborador:', err);
    }
  };

  const getStatusBadge = (st?: EmployeeStatus) => {
    if (!st) return null;
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

  const formatCpf = (cpf?: string) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  };

  const calculateTenure = (admissionDate?: string) => {
    if (!admissionDate) return '-';
    const start = new Date(admissionDate);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (diffMonths < 1) return 'Menos de 1 mês';
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`;
    const years = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    return `${years} ${years === 1 ? 'ano' : 'anos'}${
      remainingMonths > 0 ? ` e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}` : ''
    }`;
  };

  if (loading) {
    return (
      <AppLayout title="Ficha do Colaborador" subtitle="Carregando perfil...">
        <div className="py-24 text-center text-slate-400">Carregando dados do colaborador...</div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout title="Colaborador não encontrado" subtitle="Erro ao localizar registro">
        <div className="text-center py-16 space-y-4">
          <p className="text-slate-600 font-medium">O colaborador solicitado não foi encontrado.</p>
          <Button variant="primary" onClick={() => navigate('/colaboradores')}>
            Voltar para Colaboradores
          </Button>
        </div>
      </AppLayout>
    );
  }

  const tabs: TabItem[] = [
    {
      id: 'personal',
      label: 'Dados Pessoais & Endereço',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'contract',
      label: 'Contrato & Carreira',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: 'team',
      label: 'Equipe & Liderados',
      icon: <Users className="w-4 h-4" />,
      badge: employee._count?.subordinates || employee.subordinates?.length || 0,
    },
    {
      id: 'timeline',
      label: 'Histórico & Timeline',
      icon: <Clock className="w-4 h-4" />,
      badge: timeline.length,
    },
  ];

  return (
    <AppLayout
      title={employee.name}
      subtitle={`Matrícula: ${employee.registrationNumber} • ${employee.position?.title || 'Colaborador'} — ${employee.company?.tradeName}`}
    >
      {/* Botão Voltar */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/colaboradores')}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="text-slate-600 hover:text-atrio-navy"
        >
          Voltar para Lista de Colaboradores
        </Button>
      </div>

      {/* Cabeçalho do Perfil */}
      <Card className="p-6 bg-white border-atrio-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-atrio-teal/40 flex items-center justify-center font-bold text-atrio-navy text-2xl overflow-hidden shadow-xs shrink-0">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                employee.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-atrio-navy">{employee.name}</h2>
                {getStatusBadge(employee.status)}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {employee.contractType}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-700">
                {employee.position?.title || 'Sem cargo definido'}
                {employee.position?.level && (
                  <span className="text-slate-400 font-normal"> ({employee.position.level})</span>
                )}
                {employee.department && (
                  <span className="text-slate-400 font-normal"> • Setor: {employee.department.name}</span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Matrícula: {employee.registrationNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {employee.company?.tradeName}
                  {employee.unit ? ` (${employee.unit.name})` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Admitido em: {formatDate(employee.admissionDate)} ({calculateTenure(employee.admissionDate)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              icon={<Edit2 className="w-4 h-4 text-atrio-teal-dark" />}
            >
              Editar Colaborador
            </Button>

            {employee.status !== 'DESLIGADO' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                icon={<UserMinus className="w-4 h-4" />}
              >
                Desligar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Navegação por Abas */}
      <div className="space-y-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* ABA 1: DADOS PESSOAIS & ENDEREÇO */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações Básicas */}
            <Card className="p-5 space-y-4 bg-white border-atrio-border lg:col-span-2">
              <h3 className="text-sm font-bold text-atrio-navy uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-atrio-teal" />
                Informações Pessoais & Documentação
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Nome Completo</span>
                  <span className="font-semibold text-slate-800">{employee.name}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">CPF (Validado)</span>
                  <span className="font-semibold text-slate-800 font-mono flex items-center gap-1.5">
                    {formatCpf(employee.cpf)}
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">E-mail Corporativo / Principal</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {employee.email}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Telefone / WhatsApp</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {employee.phone || 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Data de Nascimento</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {formatDate(employee.birthDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Código / Crachá</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {employee.code || 'Não associado'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Contato de Emergência */}
            <Card className="p-5 space-y-4 bg-white border-atrio-border">
              <h3 className="text-sm font-bold text-atrio-navy uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                Contato de Emergência
              </h3>

              {employee.emergencyContact?.name || employee.emergencyContact?.phone ? (
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Nome do Contato</span>
                    <span className="font-semibold text-slate-800">{employee.emergencyContact.name || '-'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Grau de Parentesco</span>
                    <span className="font-semibold text-slate-800">
                      {employee.emergencyContact.relationship || 'Não informado'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Telefone de Emergência</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {employee.emergencyContact.phone || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum contato de emergência cadastrado.
                </div>
              )}
            </Card>

            {/* Endereço Residencial */}
            <Card className="p-5 space-y-4 bg-white border-atrio-border lg:col-span-3">
              <h3 className="text-sm font-bold text-atrio-navy uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Endereço Residencial
              </h3>

              {employee.address?.street || employee.address?.city ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 sm:col-span-2">
                    <span className="text-xs text-slate-400 block mb-0.5">Logradouro & Número</span>
                    <span className="font-semibold text-slate-800">
                      {employee.address.street || '-'}, {employee.address.number || 'S/N'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Bairro</span>
                    <span className="font-semibold text-slate-800">
                      {employee.address.neighborhood || '-'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Complemento</span>
                    <span className="font-semibold text-slate-800">
                      {employee.address.complement || 'Nenhum'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">Cidade / UF</span>
                    <span className="font-semibold text-slate-800">
                      {employee.address.city || '-'}
                      {employee.address.state ? ` / ${employee.address.state}` : ''}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-0.5">CEP</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {employee.address.zipCode || '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum endereço residencial cadastrado.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ABA 2: CONTRATO & CARREIRA */}
        {activeTab === 'contract' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 space-y-4 bg-white border-atrio-border lg:col-span-2">
              <h3 className="text-sm font-bold text-atrio-navy uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-atrio-teal" />
                Dados do Contrato & Vínculos Corporativos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Empresa Empregadora</span>
                  <span className="font-semibold text-slate-800">{employee.company?.tradeName}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Unidade de Lotação</span>
                  <span className="font-semibold text-slate-800">
                    {employee.unit ? `${employee.unit.name} (${employee.unit.city || ''})` : 'Matriz / Geral'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Setor / Departamento</span>
                  <span className="font-semibold text-slate-800">
                    {employee.department?.name || 'Não vinculado'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Cargo & Nível</span>
                  <span className="font-semibold text-slate-800">
                    {employee.position?.title || 'Não vinculado'}
                    {employee.position?.level && ` (${employee.position.level})`}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Tipo de Vínculo Contratual</span>
                  <span className="font-semibold text-slate-800">{employee.contractType}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Salário Base Registrado</span>
                  <span className="font-semibold text-emerald-700 font-mono">
                    {employee.salary
                      ? `R$ ${Number(employee.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Data de Admissão</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {formatDate(employee.admissionDate)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Tempo de Casa</span>
                  <span className="font-semibold text-slate-800">
                    {calculateTenure(employee.admissionDate)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Gestor Imediato */}
            <Card className="p-5 space-y-4 bg-white border-atrio-border">
              <h3 className="text-sm font-bold text-atrio-navy uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Gestão Imediata (Líder Direto)
              </h3>

              {employee.manager ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {employee.manager.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-atrio-navy truncate">
                        {employee.manager.name}
                      </h4>
                      <p className="text-xs text-slate-600 truncate">
                        {employee.manager.position?.title || 'Gestor'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Mat: {employee.manager.registrationNumber}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => navigate(`/colaboradores/${employee.manager?.id}`)}
                  >
                    Ver Perfil do Gestor
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium">Colaborador sem gestor imediato</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Reporta diretamente à Diretoria Geral.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ABA 3: EQUIPE & LIDERADOS */}
        {activeTab === 'team' && (
          <Card className="p-6 bg-white border-atrio-border">
            <EmployeeSubordinates subordinates={employee.subordinates || []} />
          </Card>
        )}

        {/* ABA 4: HISTÓRICO & TIMELINE */}
        {activeTab === 'timeline' && (
          <Card className="p-6 bg-white border-atrio-border">
            <EmployeeTimeline
              employeeId={employee.id}
              timeline={timeline}
              onRefresh={loadData}
            />
          </Card>
        )}
      </div>

      {/* Modal de Edição */}
      <EmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={loadData}
        employee={employee}
      />

      {/* Modal de Desligamento */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Desligamento"
        description={`Tem certeza que deseja desligar "${employee.name}"? Esta ação registrará um marco de desligamento na timeline e arquivará o colaborador.`}
        confirmText="Confirmar Desligamento"
        variant="danger"
      />
    </AppLayout>
  );
};
