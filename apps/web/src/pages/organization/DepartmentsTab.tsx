import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Table as TableIcon, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Briefcase 
} from 'lucide-react';
import { 
  organizationService, 
  Department, 
  DepartmentTreeNode, 
  Company 
} from '../../services/organizationService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const DepartmentsTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [treeData, setTreeData] = useState<DepartmentTreeNode[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Nós expandidos na visualização em árvore
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Setor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    companyId: '',
    name: '',
    code: '',
    costCenter: '',
    parentId: '',
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carrega empresas para o seletor
  const loadCompanies = async () => {
    try {
      const res = await organizationService.getCompanies();
      setCompanies(res.data || []);
      if (!selectedCompanyId && res.data && res.data.length > 0) {
        // Seleciona a primeira empresa por padrão se não houver
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptList, treeList] = await Promise.all([
        organizationService.getDepartments({
          companyId: selectedCompanyId || undefined,
          search: search || undefined,
        }),
        organizationService.getDepartmentTree({
          companyId: selectedCompanyId || undefined,
        }),
      ]);
      setDepartments(deptList || []);
      setTreeData(treeList || []);

      // Auto-expande nós raízes
      const initialExpanded: Record<string, boolean> = {};
      const autoExpand = (nodes: DepartmentTreeNode[]) => {
        nodes.forEach((n) => {
          initialExpanded[n.id] = true;
          if (n.children && n.children.length > 0) {
            autoExpand(n.children);
          }
        });
      };
      autoExpand(treeList || []);
      setExpandedNodes(initialExpanded);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao carregar setores' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCompanyId, search]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleOpenModal = (dept?: Department, presetParentId?: string) => {
    if (dept) {
      setEditingDepartment(dept);
      setDepartmentForm({
        companyId: dept.companyId,
        name: dept.name,
        code: dept.code || '',
        costCenter: dept.costCenter || '',
        parentId: dept.parentId || '',
        active: dept.active,
      });
    } else {
      setEditingDepartment(null);
      setDepartmentForm({
        companyId: selectedCompanyId || (companies[0]?.id ?? ''),
        name: '',
        code: '',
        costCenter: '',
        parentId: presetParentId || '',
        active: true,
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!departmentForm.companyId) errors.companyId = 'Selecione a empresa';
    if (!departmentForm.name.trim()) errors.name = 'Nome do setor é obrigatório';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        companyId: departmentForm.companyId,
        name: departmentForm.name,
        code: departmentForm.code || undefined,
        costCenter: departmentForm.costCenter || undefined,
        parentId: departmentForm.parentId ? departmentForm.parentId : null,
        active: departmentForm.active,
      };

      if (editingDepartment) {
        await organizationService.updateDepartment(editingDepartment.id, payload);
        setFeedback({ type: 'success', message: 'Setor atualizado com sucesso!' });
      } else {
        await organizationService.createDepartment(payload);
        setFeedback({ type: 'success', message: 'Setor cadastrado com sucesso!' });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar setor';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await organizationService.deleteDepartment(deleteTarget.id);
      setFeedback({ type: 'success', message: 'Setor removido com sucesso' });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao excluir setor';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDeleting(false);
    }
  };

  // Componente recursivo para renderização do nó na Árvore
  const renderTreeNode = (node: DepartmentTreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];

    return (
      <div key={node.id} className="space-y-2">
        <div
          className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-atrio-border shadow-xs hover:border-slate-300 transition-all"
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-atrio-teal" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-slate-300 shrink-0">
                •
              </span>
            )}

            <div className="w-8 h-8 rounded-lg bg-blue-50 text-atrio-navy flex items-center justify-center shrink-0 border border-blue-100">
              <Layers className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-atrio-text-primary truncate">{node.name}</span>
                {node.code && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-semibold">
                    {node.code}
                  </span>
                )}
                <Badge variant={node.active ? 'success' : 'neutral'} size="sm">
                  {node.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                {node.costCenter && <span>CC: {node.costCenter}</span>}
                <span className="flex items-center gap-1 text-slate-600">
                  <Briefcase className="w-3 h-3 text-atrio-teal" />
                  {node.positionsCount} cargo(s)
                </span>
                {hasChildren && (
                  <span className="text-slate-400">({node.children.length} subsetores)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenModal(undefined, node.id)}
              title="Adicionar Subsetor"
            >
              Subsetor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                const originalDept = departments.find((d) => d.id === node.id);
                if (originalDept) handleOpenModal(originalDept);
              }}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => {
                const originalDept = departments.find((d) => d.id === node.id);
                if (originalDept) setDeleteTarget(originalDept);
              }}
            >
              Excluir
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2 relative before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback */}
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

      {/* Controles, Filtros e Ações */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-atrio-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Seletor de Empresa */}
          <div className="w-full sm:w-56">
            <Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Todas as Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName}
                </option>
              ))}
            </Select>
          </div>

          {/* Campo de Busca */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por nome, código ou CC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Alternador Tabela / Árvore */}
          <div className="flex items-center rounded-lg border border-atrio-border bg-slate-50 p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-atrio-navy shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Árvore
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-atrio-navy shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabela
            </button>
          </div>

          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            Novo Setor
          </Button>
        </div>
      </div>

      {/* Conteúdo: Árvore ou Tabela */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-atrio-border">
          Carregando estrutura de setores...
        </div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-atrio-border space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700">Nenhum setor cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Crie a estrutura de departamentos e setores da sua empresa para definir responsabilidades e organograma.
          </p>
          <Button variant="teal" size="sm" onClick={() => handleOpenModal()}>
            Cadastrar Primeiro Setor
          </Button>
        </div>
      ) : viewMode === 'tree' ? (
        <div className="space-y-2.5">
          {treeData.map((node) => renderTreeNode(node))}
        </div>
      ) : (
        /* Visualização em Tabela */
        <div className="bg-white rounded-xl border border-atrio-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-atrio-border text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Setor / Departamento</th>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Centro de Custo</th>
                  <th className="py-3.5 px-4">Setor Superior (Pai)</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4 text-center">Cargos</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-atrio-text-primary text-sm">
                      {d.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{d.code || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{d.costCenter || '—'}</td>
                    <td className="py-3 px-4">
                      {d.parent ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {d.parent.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Raiz / Principal</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{d.company?.tradeName || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-700">{d._count?.positions || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={d.active ? 'success' : 'neutral'} size="sm">
                        {d.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(d)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição de Setor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDepartment ? 'Editar Setor' : 'Novo Setor / Departamento'}
        subtitle="Defina os parâmetros do setor e sua posição na hierarquia corporativa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Setor'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Empresa"
            value={departmentForm.companyId}
            onChange={(e) => setDepartmentForm({ ...departmentForm, companyId: e.target.value })}
            error={formErrors.companyId}
            required
          >
            <option value="">Selecione a empresa...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName}
              </option>
            ))}
          </Select>

          <Input
            label="Nome do Setor"
            placeholder="Ex: Engenharia de Software / Diretoria Comercial"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código do Setor (Opcional)"
              placeholder="Ex: TI-01, RH-02"
              value={departmentForm.code}
              onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
            />
            <Input
              label="Centro de Custo (Opcional)"
              placeholder="Ex: CC-1002"
              value={departmentForm.costCenter}
              onChange={(e) => setDepartmentForm({ ...departmentForm, costCenter: e.target.value })}
            />
          </div>

          <Select
            label="Setor Superior / Pai (Hierarquia)"
            value={departmentForm.parentId}
            onChange={(e) => setDepartmentForm({ ...departmentForm, parentId: e.target.value })}
            helperText="Deixe vazio se for um setor raiz (nível mais alto da empresa)."
          >
            <option value="">Nenhum (Setor Raiz / Nível Superior)</option>
            {departments
              .filter((d) => d.id !== editingDepartment?.id) // Previne selecionar a si mesmo
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
          </Select>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="dept-active"
              checked={departmentForm.active}
              onChange={(e) => setDepartmentForm({ ...departmentForm, active: e.target.checked })}
              className="rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal"
            />
            <label htmlFor="dept-active" className="text-xs font-semibold text-slate-700 select-none">
              Setor Ativo no Sistema
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal de Exclusão */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Setor"
        description={`Tem certeza que deseja remover o setor "${deleteTarget?.name}"? Esta ação só será permitida se não houver subsetores ou cargos vinculados a ele.`}
        confirmText="Sim, Excluir"
        isLoading={deleting}
      />
    </div>
  );
};
