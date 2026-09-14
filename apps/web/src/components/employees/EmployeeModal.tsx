import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { fetchAddressByCep, formatCep } from '../../services/viaCepService';
import {
  Employee,
  ContractType,
  EmployeeStatus,
  employeeService,
} from '../../services/employeeService';
import {
  organizationService,
  Company,
  Unit,
  Department,
  Position,
} from '../../services/organizationService';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
}) => {
  const isEditing = !!employee;
  const [activeTab, setActiveTab] = useState<'personal' | 'contract' | 'address'>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca de CEP (ViaCEP)
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatusText, setCepStatusText] = useState<string | null>(null);

  const handleCepChange = async (rawValue: string) => {
    const formatted = formatCep(rawValue);
    setForm((prev) => ({ ...prev, zipCode: formatted }));

    const cleaned = formatted.replace(/\D/g, '');
    if (cleaned.length === 8) {
      try {
        setCepLoading(true);
        setCepStatusText('Buscando CEP...');
        const address = await fetchAddressByCep(cleaned);
        if (address) {
          setForm((prev) => ({
            ...prev,
            street: address.logradouro || prev.street,
            neighborhood: address.bairro || prev.neighborhood,
            city: address.localidade || prev.city,
            state: address.uf || prev.state,
            complement: address.complemento || prev.complement,
          }));
          setCepStatusText('✅ Endereço preenchido automaticamente!');
          setTimeout(() => setCepStatusText(null), 4000);
        } else {
          setCepStatusText('⚠️ CEP não encontrado.');
          setTimeout(() => setCepStatusText(null), 4000);
        }
      } catch (err) {
        setCepStatusText('⚠️ Erro ao consultar CEP.');
        setTimeout(() => setCepStatusText(null), 4000);
      } finally {
        setCepLoading(false);
      }
    } else {
      setCepStatusText(null);
    }
  };


  // Auxiliares de seleção
  const [companies, setCompanies] = useState<Company[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);

  // Pesquisa de Gestor
  const [managerSearch, setManagerSearch] = useState('');
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [managerLoading, setManagerLoading] = useState(false);

  // Formulário
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    email: '',
    registrationNumber: '',
    code: '',
    phone: '',
    birthDate: '',
    avatarUrl: '',
    salary: '',

    companyId: '',
    unitId: '',
    departmentId: '',
    positionId: '',
    managerId: '',

    admissionDate: new Date().toISOString().split('T')[0],
    contractType: 'CLT' as ContractType,
    status: 'ATIVO' as EmployeeStatus,

    // Endereço
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    complement: '',

    // Emergência
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',

    // Justificativa na edição
    reason: '',
    eventDate: '',
  });

  // Carrega opções organizacionais
  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      try {
        const [comps, depts, pos, emps] = await Promise.all([
          organizationService.getCompanies(),
          organizationService.getDepartments(),
          organizationService.getPositions(),
          employeeService.getEmployees({ pageSize: 100, status: 'ATIVO' }),
        ]);

        const compList = comps.data || [];
        setCompanies(compList);
        setDepartments(depts || []);
        setPositions(pos.data || []);

        if (!employee) {
          setForm((prev) => ({
            ...prev,
            companyId: prev.companyId || compList[0]?.id || '',
          }));
        }

        // Filtra potenciais gestores (remove o próprio colaborador para evitar auto-gestão óbvia)
        const validManagers = (emps.data || []).filter((e) => !employee || e.id !== employee.id);
        setPotentialManagers(validManagers);
      } catch (err) {
        console.error('Erro ao carregar opções organizacionais:', err);
      }
    };

    loadOptions();
  }, [isOpen, employee]);

  // Busca de gestores dinâmica no backend conforme digitação (com debounce)
  useEffect(() => {
    if (!isOpen || !isManagerDropdownOpen) return;

    const timer = setTimeout(async () => {
      try {
        setManagerLoading(true);
        const res = await employeeService.getEmployees({
          search: managerSearch.trim() || undefined,
          pageSize: 50,
          status: 'ATIVO',
        });
        const list = (res.data || []).filter((e) => !employee || e.id !== employee.id);
        setPotentialManagers(list);
      } catch (err) {
        console.error('Erro ao pesquisar gestores no backend:', err);
      } finally {
        setManagerLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [managerSearch, isOpen, isManagerDropdownOpen, employee]);

  // Carrega unidades quando a empresa selecionada muda
  useEffect(() => {
    if (!form.companyId) {
      setUnits([]);
      return;
    }

    const loadUnits = async () => {
      try {
        const data = await organizationService.getCompanyUnits(form.companyId);
        setUnits(data || []);
      } catch (err) {
        console.error('Erro ao carregar unidades:', err);
      }
    };

    loadUnits();
  }, [form.companyId]);

  // Preenche dados para edição
  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      setForm({
        name: employee.name || '',
        cpf: employee.cpf || '',
        email: employee.email || '',
        registrationNumber: employee.registrationNumber || '',
        code: employee.code || '',
        phone: employee.phone || '',
        birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
        avatarUrl: employee.avatarUrl || '',
        salary: employee.salary ? String(employee.salary) : '',

        companyId: employee.companyId || '',
        unitId: employee.unitId || '',
        departmentId: employee.departmentId || '',
        positionId: employee.positionId || '',
        managerId: employee.managerId || '',

        admissionDate: employee.admissionDate
          ? employee.admissionDate.split('T')[0]
          : new Date().toISOString().split('T')[0],
        contractType: employee.contractType || 'CLT',
        status: employee.status || 'ATIVO',

        street: employee.address?.street || '',
        number: employee.address?.number || '',
        neighborhood: employee.address?.neighborhood || '',
        city: employee.address?.city || '',
        state: employee.address?.state || '',
        zipCode: employee.address?.zipCode || '',
        complement: employee.address?.complement || '',

        emergencyName: employee.emergencyContact?.name || '',
        emergencyRelationship: employee.emergencyContact?.relationship || '',
        emergencyPhone: employee.emergencyContact?.phone || '',

        reason: '',
        eventDate: '',
      });
    } else {
      setForm({
        name: '',
        cpf: '',
        email: '',
        registrationNumber: '',
        code: '',
        phone: '',
        birthDate: '',
        avatarUrl: '',
        salary: '',

        companyId: companies[0]?.id || '',
        unitId: '',
        departmentId: '',
        positionId: '',
        managerId: '',

        admissionDate: new Date().toISOString().split('T')[0],
        contractType: 'CLT',
        status: 'ATIVO',

        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        complement: '',

        emergencyName: '',
        emergencyRelationship: '',
        emergencyPhone: '',

        reason: '',
        eventDate: '',
      });
    }
    setError(null);
    setManagerSearch('');
    setIsManagerDropdownOpen(false);
    setActiveTab('personal');
  }, [employee, isOpen]);

  // Formatação automática do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    if (val.length > 9) {
      val = val.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    } else if (val.length > 6) {
      val = val.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (val.length > 3) {
      val = val.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
    }
    setForm({ ...form, cpf: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cpf.trim() || !form.email.trim() || !form.registrationNumber.trim() || !form.companyId) {
      setError('Por favor, preencha todos os campos obrigatórios (Nome, CPF, E-mail, Matrícula e Empresa).');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const address =
        form.street || form.city || form.zipCode
          ? {
              street: form.street,
              number: form.number,
              neighborhood: form.neighborhood,
              city: form.city,
              state: form.state,
              zipCode: form.zipCode,
              complement: form.complement,
            }
          : undefined;

      const emergencyContact =
        form.emergencyName || form.emergencyPhone
          ? {
              name: form.emergencyName,
              relationship: form.emergencyRelationship,
              phone: form.emergencyPhone,
            }
          : undefined;

      if (isEditing && employee) {
        await employeeService.updateEmployee(employee.id, {
          name: form.name,
          cpf: form.cpf,
          email: form.email,
          registrationNumber: form.registrationNumber,
          code: form.code || null,
          phone: form.phone || null,
          birthDate: form.birthDate || null,
          avatarUrl: form.avatarUrl || null,
          salary: form.salary ? Number(form.salary) : null,
          companyId: form.companyId,
          unitId: form.unitId || null,
          departmentId: form.departmentId || null,
          positionId: form.positionId || null,
          managerId: form.managerId || null,
          admissionDate: form.admissionDate,
          contractType: form.contractType,
          status: form.status,
          address: address || null,
          emergencyContact: emergencyContact || null,
          reason: form.reason || undefined,
          eventDate: form.eventDate || undefined,
        });
      } else {
        await employeeService.createEmployee({
          name: form.name,
          cpf: form.cpf,
          email: form.email,
          registrationNumber: form.registrationNumber,
          code: form.code || null,
          phone: form.phone || null,
          birthDate: form.birthDate || null,
          avatarUrl: form.avatarUrl || null,
          salary: form.salary ? Number(form.salary) : null,
          companyId: form.companyId,
          unitId: form.unitId || null,
          departmentId: form.departmentId || null,
          positionId: form.positionId || null,
          managerId: form.managerId || null,
          admissionDate: form.admissionDate,
          contractType: form.contractType,
          status: form.status,
          address,
          emergencyContact,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Ocorreu um erro ao salvar o colaborador. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const modalTabs = [
    { id: 'personal', label: 'Dados Pessoais', icon: <User className="w-4 h-4" /> },
    { id: 'contract', label: 'Vínculos & Contrato', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'address', label: 'Endereço & Emergência', icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Colaborador: ${employee?.name}` : 'Cadastrar Novo Colaborador'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Tabs
          tabs={modalTabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
          variant="fullWidth"
        />

        {/* ABA 1: DADOS PESSOAIS */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="sm:col-span-2">
              <Input
                label="Nome Completo"
                placeholder="Ex: Mariana Silva Albuquerque"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={handleCpfChange}
              required
              helperText="Validação estrita com dígitos verificadores"
            />

            <Input
              label="E-mail Corporativo ou Pessoal"
              type="email"
              placeholder="mariana.silva@empresa.com.br"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Telefone / WhatsApp"
              placeholder="(11) 98765-4321"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <Input
              label="Data de Nascimento"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              leftIcon={<Calendar className="w-4 h-4" />}
            />

            <div className="sm:col-span-2">
              <Input
                label="URL da Foto de Perfil (Avatar)"
                placeholder="https://..."
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                helperText="Link direto para imagem (JPG, PNG ou WebP)"
              />
            </div>
          </div>
        )}

        {/* ABA 2: VÍNCULOS & CONTRATO */}
        {activeTab === 'contract' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Select
              label="Empresa"
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value, unitId: '' })}
              options={[
                { value: '', label: 'Selecione uma empresa...' },
                ...companies.map((c) => ({ value: c.id, label: c.tradeName })),
              ]}
              required
            />

            <Select
              label="Unidade Operacional"
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              options={[
                { value: '', label: 'Selecione a unidade...' },
                ...units.map((u) => ({
                  value: u.id,
                  label: `${u.name}${u.city ? ` (${u.city}/${u.state || ''})` : ''}`,
                })),
              ]}
            />

            <Select
              label="Setor / Departamento"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={[
                { value: '', label: 'Selecione o setor...' },
                ...departments.map((d) => ({
                  value: d.id,
                  label: `${d.name}${d.code ? ` (${d.code})` : ''}`,
                })),
              ]}
            />

            <Select
              label="Cargo & Nível"
              value={form.positionId}
              onChange={(e) => setForm({ ...form, positionId: e.target.value })}
              options={[
                { value: '', label: 'Selecione o cargo...' },
                ...positions.map((p) => ({
                  value: p.id,
                  label: `${p.title} (${p.level})`,
                })),
              ]}
            />

            <div className="sm:col-span-2 relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gestor Imediato (Líder Direto)
              </label>

              {/* Seletor com busca */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                  className="w-full bg-white border border-atrio-border rounded-lg px-3 py-2 text-left text-sm flex items-center justify-between hover:border-atrio-teal/50 focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal transition-all"
                >
                  <span className="truncate">
                    {(() => {
                      if (!form.managerId) {
                        return <span className="text-slate-500">Nenhum (Reporta à Diretoria Geral / Sem Gestor)</span>;
                      }
                      const selectedMgr = potentialManagers.find((m) => m.id === form.managerId);
                      if (selectedMgr) {
                        return (
                          <span className="text-slate-900 font-medium">
                            {selectedMgr.name}{' '}
                            <span className="text-xs text-slate-500 font-normal">
                              — {selectedMgr.position?.title || 'Colaborador'} ({selectedMgr.registrationNumber})
                            </span>
                          </span>
                        );
                      }
                      return <span className="text-slate-500">Selecione o gestor...</span>;
                    })()}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {form.managerId && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm({ ...form, managerId: '' });
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        title="Limpar gestor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown com Campo de Pesquisa */}
                {isManagerDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative">
                        {managerLoading ? (
                          <Loader2 className="w-3.5 h-3.5 text-atrio-teal absolute left-2.5 top-1/2 -translate-y-1/2 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        )}
                        <input
                          type="text"
                          value={managerSearch}
                          onChange={(e) => setManagerSearch(e.target.value)}
                          placeholder="Pesquisar gestor por nome, cargo ou matrícula..."
                          autoFocus
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
                      {/* Opção Sem Gestor */}
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, managerId: '' });
                          setIsManagerDropdownOpen(false);
                          setManagerSearch('');
                        }}
                        className={`w-full px-3 py-2 text-left text-xs rounded-lg flex items-center justify-between transition-colors ${
                          !form.managerId ? 'bg-teal-50 text-atrio-teal font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>Nenhum (Reporta à Diretoria Geral / Sem Gestor)</span>
                        {!form.managerId && <Check className="w-3.5 h-3.5 text-atrio-teal shrink-0" />}
                      </button>

                      {/* Lista filtrada de gestores */}
                      {(() => {
                        const filtered = potentialManagers.filter((m) => {
                          const query = managerSearch.toLowerCase().trim();
                          if (!query) return true;
                          const name = m.name?.toLowerCase() || '';
                          const pos = m.position?.title?.toLowerCase() || '';
                          const reg = m.registrationNumber?.toLowerCase() || '';
                          const dept = m.department?.name?.toLowerCase() || '';
                          return name.includes(query) || pos.includes(query) || reg.includes(query) || dept.includes(query);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="py-4 text-center text-xs text-slate-400">
                              Nenhum gestor encontrado com "{managerSearch}".
                            </div>
                          );
                        }

                        return filtered.map((m) => {
                          const isSelected = form.managerId === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, managerId: m.id });
                                setIsManagerDropdownOpen(false);
                                setManagerSearch('');
                              }}
                              className={`w-full px-3 py-2 text-left text-xs rounded-lg flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-teal-50 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold text-slate-800 truncate">{m.name}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                                  <span>{m.position?.title || 'Colaborador'}</span>
                                  <span>•</span>
                                  <span className="font-mono">Matrícula: {m.registrationNumber}</span>
                                  {m.department?.name && (
                                    <>
                                      <span>•</span>
                                      <span>{m.department.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-atrio-teal shrink-0" />}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-1">
                O sistema valida automaticamente e impede ciclos de subordinação ou auto-gestão
              </p>
            </div>

            <Input
              label="Matrícula"
              placeholder="Ex: MAT-0104"
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
              required
              helperText="Única por empresa"
            />

            <Input
              label="Código do Crachá / ID Interno"
              placeholder="Ex: CR-883"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />

            <Select
              label="Tipo de Contrato"
              value={form.contractType}
              onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })}
              options={[
                { value: 'CLT', label: 'CLT (Efetivo)' },
                { value: 'PJ', label: 'PJ (Prestador de Serviços)' },
                { value: 'ESTAGIO', label: 'Estágio' },
                { value: 'APRENDIZ', label: 'Jovem Aprendiz' },
                { value: 'TEMPORARIO', label: 'Temporário' },
              ]}
              required
            />

            <Input
              label="Data de Admissão"
              type="date"
              value={form.admissionDate}
              onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
              required
              leftIcon={<Calendar className="w-4 h-4" />}
            />

            <Input
              label="Salário Base (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />

            <Select
              label="Situação do Colaborador"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as EmployeeStatus })}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'FERIAS', label: 'Férias' },
                { value: 'AFASTADO', label: 'Afastado' },
                { value: 'DESLIGADO', label: 'Desligado' },
              ]}
              required
            />

            {isEditing && (
              <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3 mt-2">
                <p className="text-xs font-bold text-atrio-navy uppercase tracking-wider">
                  Rastreabilidade & Histórico (Timeline)
                </p>
                <Input
                  label="Justificativa da Alteração (Opcional)"
                  placeholder="Ex: Promoção após conclusão de ciclo avaliativo..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  helperText="Esta descrição ficará registrada no histórico do colaborador"
                />
                <Input
                  label="Data de Vigência da Alteração (Opcional)"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  helperText="Deixe em branco para usar a data de hoje"
                />
              </div>
            )}
          </div>
        )}

        {/* ABA 3: ENDEREÇO & EMERGÊNCIA */}
        {activeTab === 'address' && (
          <div className="space-y-5 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider pb-1 border-b border-slate-100">
                Endereço Residencial
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    maxLength={9}
                    value={form.zipCode}
                    onChange={(e) => handleCepChange(e.target.value)}
                    helperText={cepStatusText || 'Digite os 8 dígitos para buscar automaticamente'}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-8">
                      <Loader2 className="w-4 h-4 text-atrio-teal animate-spin" />
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Logradouro / Rua / Avenida"
                    placeholder="Ex: Av. Paulista"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                  />
                </div>
                <Input
                  label="Número"
                  placeholder="1000"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
                <Input
                  label="Bairro"
                  placeholder="Bela Vista"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                />
                <Input
                  label="Complemento"
                  placeholder="Apto 42"
                  value={form.complement}
                  onChange={(e) => setForm({ ...form, complement: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Cidade"
                    placeholder="São Paulo"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <Input
                  label="Estado (UF)"
                  placeholder="SP"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider pb-1 border-b border-slate-100">
                Contato de Emergência
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Nome do Contato"
                  placeholder="Ex: Carlos Albuquerque"
                  value={form.emergencyName}
                  onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                />
                <Input
                  label="Parentesco / Relação"
                  placeholder="Ex: Cônjuge, Mãe, Irmão"
                  value={form.emergencyRelationship}
                  onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })}
                />
                <Input
                  label="Telefone de Emergência"
                  placeholder="(11) 98888-7777"
                  value={form.emergencyPhone}
                  onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between pt-4 border-t border-atrio-border">
          <div className="flex gap-2">
            {activeTab !== 'personal' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setActiveTab(activeTab === 'address' ? 'contract' : 'personal')
                }
              >
                Voltar
              </Button>
            )}
            {activeTab !== 'address' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setActiveTab(activeTab === 'personal' ? 'contract' : 'address')
                }
              >
                Próxima Aba
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Concluir Admissão'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
