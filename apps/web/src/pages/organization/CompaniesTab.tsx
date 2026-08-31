import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { organizationService, Company, Unit } from '../../services/organizationService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const CompaniesTab: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [companyUnits, setCompanyUnits] = useState<Record<string, Unit[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<Record<string, boolean>>({});

  // Feedback / Mensagem
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Empresa
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    legalName: '',
    tradeName: '',
    cnpj: '',
    active: true,
  });
  const [companyFormErrors, setCompanyFormErrors] = useState<Record<string, string>>({});
  const [submittingCompany, setSubmittingCompany] = useState(false);

  // Modal Unidade
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitCompanyId, setUnitCompanyId] = useState<string>('');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    city: '',
    state: '',
    address: '',
    active: true,
  });
  const [submittingUnit, setSubmittingUnit] = useState(false);

  // Modal Exclusão
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'company' | 'unit'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await organizationService.getCompanies({ search: search || undefined });
      setCompanies(res.data || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao carregar empresas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const toggleExpandCompany = async (companyId: string) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      return;
    }

    setExpandedCompanyId(companyId);
    if (!companyUnits[companyId]) {
      try {
        setLoadingUnits((prev) => ({ ...prev, [companyId]: true }));
        const units = await organizationService.getCompanyUnits(companyId);
        setCompanyUnits((prev) => ({ ...prev, [companyId]: units }));
      } catch (err) {
        setFeedback({ type: 'error', message: 'Erro ao buscar unidades da empresa' });
      } finally {
        setLoadingUnits((prev) => ({ ...prev, [companyId]: false }));
      }
    }
  };

  const handleOpenCompanyModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({
        legalName: company.legalName,
        tradeName: company.tradeName,
        cnpj: company.cnpj,
        active: company.active,
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({
        legalName: '',
        tradeName: '',
        cnpj: '',
        active: true,
      });
    }
    setCompanyFormErrors({});
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyFormErrors({});

    const errors: Record<string, string> = {};
    if (!companyForm.legalName.trim()) errors.legalName = 'Razão social é obrigatória';
    if (!companyForm.tradeName.trim()) errors.tradeName = 'Nome fantasia é obrigatório';
    if (!companyForm.cnpj.trim()) errors.cnpj = 'CNPJ é obrigatório';

    if (Object.keys(errors).length > 0) {
      setCompanyFormErrors(errors);
      return;
    }

    try {
      setSubmittingCompany(true);
      if (editingCompany) {
        await organizationService.updateCompany(editingCompany.id, companyForm);
        setFeedback({ type: 'success', message: 'Empresa atualizada com sucesso!' });
      } else {
        await organizationService.createCompany(companyForm);
        setFeedback({ type: 'success', message: 'Empresa cadastrada com sucesso!' });
      }
      setIsCompanyModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar empresa';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingCompany(false);
    }
  };

  const handleOpenUnitModal = (companyId: string, unit?: Unit) => {
    setUnitCompanyId(companyId);
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({
        name: unit.name,
        city: unit.city || '',
        state: unit.state || '',
        address: unit.address || '',
        active: unit.active,
      });
    } else {
      setEditingUnit(null);
      setUnitForm({
        name: '',
        city: '',
        state: '',
        address: '',
        active: true,
      });
    }
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) return;

    try {
      setSubmittingUnit(true);
      if (editingUnit) {
        await organizationService.updateUnit(editingUnit.id, {
          companyId: unitCompanyId,
          ...unitForm,
        });
        setFeedback({ type: 'success', message: 'Unidade atualizada com sucesso!' });
      } else {
        await organizationService.createUnit({
          companyId: unitCompanyId,
          ...unitForm,
        });
        setFeedback({ type: 'success', message: 'Unidade cadastrada com sucesso!' });
      }
      setIsUnitModalOpen(false);

      // Recarrega unidades daquela empresa
      const units = await organizationService.getCompanyUnits(unitCompanyId);
      setCompanyUnits((prev) => ({ ...prev, [unitCompanyId]: units }));
      fetchCompanies();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar unidade';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingUnit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      if (deleteTarget.type === 'company') {
        await organizationService.deleteCompany(deleteTarget.id);
        setFeedback({ type: 'success', message: 'Empresa removida com sucesso' });
        fetchCompanies();
      } else {
        await organizationService.deleteUnit(deleteTarget.id);
        setFeedback({ type: 'success', message: 'Unidade removida com sucesso' });
        if (expandedCompanyId) {
          const units = await organizationService.getCompanyUnits(expandedCompanyId);
          setCompanyUnits((prev) => ({ ...prev, [expandedCompanyId]: units }));
        }
        fetchCompanies();
      }
      setDeleteTarget(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao excluir item';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-semibold underline ml-4 text-xs">
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Ações & Filtro */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-atrio-border shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por razão social, fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenCompanyModal()}>
          Nova Empresa
        </Button>
      </div>

      {/* Listagem de Empresas */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-atrio-border">
            Carregando empresas...
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-atrio-border space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-700">Nenhuma empresa cadastrada</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cadastre a matriz e filiais da sua organização para estruturar unidades, setores e cargos.
            </p>
            <Button variant="teal" size="sm" onClick={() => handleOpenCompanyModal()}>
              Cadastrar Primeira Empresa
            </Button>
          </div>
        ) : (
          companies.map((comp) => {
            const isExpanded = expandedCompanyId === comp.id;
            const units = companyUnits[comp.id] || [];
            const isLoadingThisUnits = loadingUnits[comp.id];

            return (
              <div
                key={comp.id}
                className="bg-white rounded-xl border border-atrio-border shadow-sm overflow-hidden transition-all"
              >
                {/* Header do Card da Empresa */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-atrio-navy flex items-center justify-center font-bold shrink-0 border border-blue-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-bold text-atrio-text-primary text-base leading-snug">
                          {comp.tradeName}
                        </h4>
                        <Badge variant={comp.active ? 'success' : 'neutral'} size="sm" dot>
                          {comp.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {comp.legalName} • CNPJ: <span className="font-mono text-slate-700">{comp.cnpj}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleExpandCompany(comp.id)}
                      className="px-3 py-1.5 rounded-lg border border-atrio-border text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-atrio-teal" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <span>{comp._count?.units ?? 0} Unidade(s)</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenCompanyModal(comp)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() =>
                        setDeleteTarget({
                          type: 'company',
                          id: comp.id,
                          name: comp.tradeName,
                        })
                      }
                    >
                      Excluir
                    </Button>
                  </div>
                </div>

                {/* Bloco Expansível de Unidades */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-[#F9FAFB] border-t border-atrio-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-atrio-teal" />
                        Unidades / Locais de Trabalho ({units.length})
                      </h5>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Plus className="w-3 h-3" />}
                        onClick={() => handleOpenUnitModal(comp.id)}
                      >
                        Nova Unidade
                      </Button>
                    </div>

                    {isLoadingThisUnits ? (
                      <p className="text-xs text-slate-400 py-3">Carregando unidades...</p>
                    ) : units.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-dashed border-slate-200">
                        Nenhuma unidade física cadastrada para esta empresa.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {units.map((unit) => (
                          <div
                            key={unit.id}
                            className="p-3 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-3 shadow-2xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-slate-800 truncate">{unit.name}</span>
                                <Badge variant={unit.active ? 'success' : 'neutral'} size="sm">
                                  {unit.active ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 truncate">
                                {unit.city || unit.state ? `${unit.city || ''} - ${unit.state || ''}` : 'Local não especificado'}
                              </p>
                              {unit.address && <p className="text-[10px] text-slate-400 truncate">{unit.address}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenUnitModal(comp.id, unit)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="Editar Unidade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'unit',
                                    id: unit.id,
                                    name: unit.name,
                                  })
                                }
                                className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Excluir Unidade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Empresa */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
        subtitle="Preencha os dados cadastrais da empresa matriz ou filial"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCompanyModalOpen(false)} disabled={submittingCompany}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveCompany} disabled={submittingCompany}>
              {submittingCompany ? 'Salvando...' : 'Salvar Empresa'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <Input
            label="Razão Social"
            placeholder="Ex: Átrio Soluções Tecnológicas Ltda"
            value={companyForm.legalName}
            onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
            error={companyFormErrors.legalName}
            required
          />
          <Input
            label="Nome Fantasia"
            placeholder="Ex: Átrio Digital"
            value={companyForm.tradeName}
            onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
            error={companyFormErrors.tradeName}
            required
          />
          <Input
            label="CNPJ"
            placeholder="Ex: 00.000.000/0001-00"
            value={companyForm.cnpj}
            onChange={(e) => setCompanyForm({ ...companyForm, cnpj: e.target.value })}
            error={companyFormErrors.cnpj}
            helperText="Digite apenas os números ou com pontuação padrão."
            required
          />
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="company-active"
              checked={companyForm.active}
              onChange={(e) => setCompanyForm({ ...companyForm, active: e.target.checked })}
              className="rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal"
            />
            <label htmlFor="company-active" className="text-xs font-semibold text-slate-700 select-none">
              Empresa Ativa no Sistema
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal Unidade */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={editingUnit ? 'Editar Unidade' : 'Nova Unidade de Trabalho'}
        subtitle="Cadastre o local de trabalho ou endereço operacional"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUnitModalOpen(false)} disabled={submittingUnit}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveUnit} disabled={submittingUnit}>
              {submittingUnit ? 'Salvando...' : 'Salvar Unidade'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveUnit} className="space-y-4">
          <Input
            label="Nome da Unidade"
            placeholder="Ex: Matriz - São Paulo / Polo Operacional"
            value={unitForm.name}
            onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cidade"
              placeholder="Ex: São Paulo"
              value={unitForm.city}
              onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
            />
            <Input
              label="Estado (UF)"
              placeholder="Ex: SP"
              maxLength={2}
              value={unitForm.state}
              onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value.toUpperCase() })}
            />
          </div>
          <Input
            label="Endereço Completo"
            placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
            value={unitForm.address}
            onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })}
          />
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="unit-active"
              checked={unitForm.active}
              onChange={(e) => setUnitForm({ ...unitForm, active: e.target.checked })}
              className="rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal"
            />
            <label htmlFor="unit-active" className="text-xs font-semibold text-slate-700 select-none">
              Unidade Ativa
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal de Exclusão */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === 'company' ? 'Excluir Empresa' : 'Excluir Unidade'}
        description={`Tem certeza que deseja remover ${deleteTarget?.type === 'company' ? 'a empresa' : 'a unidade'} "${deleteTarget?.name}"? Esta ação desativará os registros associados.`}
        confirmText="Sim, Excluir"
        isLoading={deleting}
      />
    </div>
  );
};
