import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Layers, 
  FileText, 
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { 
  organizationService, 
  Position, 
  Department 
} from '../../services/organizationService';
import { integrationService } from '../../services/integrationService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const LEVEL_OPTIONS = [
  'Operacional',
  'Estagiário',
  'Assistente',
  'Auxiliar',
  'Analista',
  'Júnior',
  'Pleno',
  'Sênior',
  'Especialista',
  'Líder Técnico',
  'Coordenador',
  'Gerente',
  'Diretor',
  'C-Level',
];

export const PositionsTab: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingRhid, setSyncingRhid] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Cargo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionForm, setPositionForm] = useState({
    departmentId: '',
    title: '',
    level: 'Operacional',
    description: '',
    responsibilities: '',
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal Detalhes do Cargo (Visualização)
  const [viewingPosition, setViewingPosition] = useState<Position | null>(null);

  // Modal Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDepartments = async () => {
    try {
      const res = await organizationService.getDepartments();
      setDepartments(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPositions = async () => {
    try {
      setLoading(true);
      const res = await organizationService.getPositions({
        search: search || undefined,
        departmentId: selectedDepartmentId || undefined,
        level: selectedLevel || undefined,
        pageSize: 1000,
      });
      setPositions(res.data || []);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao carregar cargos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRhid = async () => {
    try {
      setSyncingRhid(true);
      const res = await integrationService.syncRhidOrganization();
      setFeedback({
        type: 'success',
        message: `Sincronização RHiD concluída: ${res.positionsCount} cargos e ${res.departmentsCount} departamentos mapeados.`,
      });
      await loadPositions();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Falha ao sincronizar cargos com o RHiD.',
      });
    } finally {
      setSyncingRhid(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadPositions();
  }, [search, selectedDepartmentId, selectedLevel]);

  const handleOpenModal = (pos?: Position) => {
    if (pos) {
      setEditingPosition(pos);
      setPositionForm({
        departmentId: pos.departmentId || '',
        title: pos.title,
        level: pos.level,
        description: pos.description || '',
        responsibilities: pos.responsibilities || '',
        active: pos.active,
      });
    } else {
      setEditingPosition(null);
      setPositionForm({
        departmentId: selectedDepartmentId || (departments[0]?.id ?? ''),
        title: '',
        level: 'Pleno',
        description: '',
        responsibilities: '',
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
    if (!positionForm.title.trim()) errors.title = 'Título do cargo é obrigatório';
    if (!positionForm.level.trim()) errors.level = 'Nível é obrigatório';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        departmentId: positionForm.departmentId ? positionForm.departmentId : null,
        title: positionForm.title,
        level: positionForm.level,
        description: positionForm.description || undefined,
        responsibilities: positionForm.responsibilities || undefined,
        active: positionForm.active,
      };

      if (editingPosition) {
        await organizationService.updatePosition(editingPosition.id, payload);
        setFeedback({ type: 'success', message: 'Cargo atualizado com sucesso!' });
      } else {
        await organizationService.createPosition(payload);
        setFeedback({ type: 'success', message: 'Cargo cadastrado com sucesso!' });
      }

      setIsModalOpen(false);
      loadPositions();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar cargo';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await organizationService.deletePosition(deleteTarget.id);
      setFeedback({ type: 'success', message: 'Cargo removido com sucesso' });
      setDeleteTarget(null);
      loadPositions();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao excluir cargo';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDeleting(false);
    }
  };

  const getLevelBadgeVariant = (level: string): 'teal' | 'navy' | 'info' | 'neutral' | 'warning' => {
    switch (level) {
      case 'C-Level':
      case 'Diretor':
        return 'navy';
      case 'Gerente':
      case 'Coordenador':
      case 'Líder Técnico':
        return 'teal';
      case 'Sênior':
      case 'Especialista':
        return 'info';
      case 'Pleno':
      case 'Júnior':
        return 'neutral';
      default:
        return 'neutral';
    }
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

      {/* Barra de Filtros e Criação */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-atrio-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Busca */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por cargo ou atribuição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Filtro por Setor */}
          <div className="w-full sm:w-52">
            <Select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
            >
              <option value="">Todos os Setores</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Filtro por Nível */}
          <div className="w-full sm:w-44">
            <Select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">Todos os Níveis</option>
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSyncRhid}
            disabled={loading || syncingRhid}
            className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold"
            title="Sincronizar cargos com o RHiD Cloud"
          >
            {syncingRhid ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5 text-indigo-600" />
            )}
            Sincronizar com RHiD
          </Button>

          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            Novo Cargo
          </Button>
        </div>
      </div>

      {/* Tabela de Cargos */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-atrio-border">
          Carregando cargos...
        </div>
      ) : positions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-atrio-border space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-700">Nenhum cargo cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cadastre os cargos, níveis de senioridade e atribuições para associar aos colaboradores e organograma.
          </p>
          <Button variant="teal" size="sm" onClick={() => handleOpenModal()}>
            Cadastrar Primeiro Cargo
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-atrio-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-atrio-border text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cargo / Função</th>
                  <th className="py-3.5 px-4">Nível de Senioridade</th>
                  <th className="py-3.5 px-4">Setor / Departamento</th>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-atrio-teal-dark flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-atrio-text-primary">{pos.title}</p>
                          {pos.description && (
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">{pos.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getLevelBadgeVariant(pos.level)} size="sm">
                        {pos.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {pos.department ? (
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-atrio-teal" />
                          {pos.department.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Geral / Não atribuído</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pos.department?.company?.tradeName || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={pos.active ? 'success' : 'neutral'} size="sm">
                        {pos.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingPosition(pos)}
                          className="p-1.5 text-slate-400 hover:text-atrio-navy hover:bg-slate-100 rounded"
                          title="Visualizar Descritivo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(pos)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(pos)}
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

      {/* Modal Cadastro/Edição de Cargo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPosition ? 'Editar Cargo' : 'Novo Cargo / Função'}
        subtitle="Defina o título, nível de senioridade e atribuições do cargo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar Cargo'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Título do Cargo"
            placeholder="Ex: Engenheiro de Software Fullstack / Analista de RH"
            value={positionForm.title}
            onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
            error={formErrors.title}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Nível de Senioridade"
              value={positionForm.level}
              onChange={(e) => setPositionForm({ ...positionForm, level: e.target.value })}
              error={formErrors.level}
              required
            >
              {LEVEL_OPTIONS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </Select>

            <Select
              label="Setor Vinculado"
              value={positionForm.departmentId}
              onChange={(e) => setPositionForm({ ...positionForm, departmentId: e.target.value })}
            >
              <option value="">Setor Geral / Não Específico</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.company?.tradeName || 'Matriz'})
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Descrição Resumida do Cargo"
            placeholder="Ex: Atuação no desenvolvimento de soluções backend e APIs"
            value={positionForm.description}
            onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
          />

          <Textarea
            label="Principais Responsabilidades e Atribuições"
            placeholder="Ex: - Desenvolver microsserviços em Node.js&#10;- Manter integrações com sistemas externos&#10;- Garantir cobertura de testes"
            rows={4}
            value={positionForm.responsibilities}
            onChange={(e) => setPositionForm({ ...positionForm, responsibilities: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="pos-active"
              checked={positionForm.active}
              onChange={(e) => setPositionForm({ ...positionForm, active: e.target.checked })}
              className="rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal"
            />
            <label htmlFor="pos-active" className="text-xs font-semibold text-slate-700 select-none">
              Cargo Ativo para Alocação
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalhes do Cargo (Visualização) */}
      {viewingPosition && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPosition(null)}
          title={viewingPosition.title}
          subtitle={`Detalhamento de Perfil e Requisitos • ${viewingPosition.level}`}
          footer={
            <Button variant="secondary" onClick={() => setViewingPosition(null)}>
              Fechar
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Setor / Departamento</span>
                <p className="font-semibold text-slate-800 text-sm">
                  {viewingPosition.department?.name || 'Geral'}
                </p>
              </div>
              <Badge variant={getLevelBadgeVariant(viewingPosition.level)} size="md">
                {viewingPosition.level}
              </Badge>
            </div>

            {viewingPosition.description && (
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resumo da Função
                </h5>
                <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                  {viewingPosition.description}
                </p>
              </div>
            )}

            {viewingPosition.responsibilities ? (
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-atrio-teal" />
                  Responsabilidades & Atribuições
                </h5>
                <div className="text-xs text-slate-700 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-line">
                  {viewingPosition.responsibilities}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Nenhuma responsabilidade específica detalhada no cadastro deste cargo.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de Exclusão */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Cargo"
        description={`Tem certeza que deseja remover o cargo "${deleteTarget?.title}" (${deleteTarget?.level})?`}
        confirmText="Sim, Excluir"
        isLoading={deleting}
      />
    </div>
  );
};
