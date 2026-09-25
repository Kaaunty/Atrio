import React, { useEffect, useState } from 'react';
import { Users, Plus, RefreshCw, Search, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { CandidateModal } from '../../components/recruitment/CandidateModal';

export const CandidatesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('recrutamento.gerenciar');

  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCandidates = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const res = await api.get('/recruitment/candidates', {
        params: searchTerm ? { search: searchTerm } : undefined,
      });
      setCandidates(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar candidatos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates(search.trim() || undefined);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/recruitment/candidates/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchCandidates(search.trim() || undefined);
    } catch (err) {
      console.error('Erro ao excluir candidato:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-atrio-teal" />
              Candidatos
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Cadastro e gestão da base de candidatos para os processos seletivos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => fetchCandidates(search.trim() || undefined)}
              disabled={loading}
            >
              Atualizar
            </Button>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingCandidate(null);
                  setShowModal(true);
                }}
              >
                Novo Candidato
              </Button>
            )}
          </div>
        </div>

        <Card padding="md" className="space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
              />
            </div>
            <Button variant="secondary" size="sm" type="submit" icon={<Search className="w-4 h-4" />}>
              Buscar
            </Button>
          </form>

          {candidates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">E-mail</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Fonte</th>
                    <th className="py-2.5 px-3">Currículo</th>
                    {canManage && <th className="py-2.5 px-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((candidate: any) => (
                    <tr key={candidate.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-800 font-bold">{candidate.name}</strong>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{candidate.email}</td>
                      <td className="py-2.5 px-3 text-slate-600">{candidate.phone || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{candidate.source || '-'}</td>
                      <td className="py-2.5 px-3">
                        {candidate.resumeUrl ? (
                          <a
                            href={candidate.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-atrio-teal-dark hover:underline"
                          >
                            Ver <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setEditingCandidate(candidate);
                                setShowModal(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => setDeleteTarget(candidate)}
                              className="hover:bg-rose-50 hover:text-rose-700"
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">Nenhum candidato encontrado.</div>
          )}
        </Card>

        <CandidateModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCandidate(null);
          }}
          onSuccess={() => fetchCandidates(search.trim() || undefined)}
          candidate={editingCandidate}
        />

        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Excluir Candidato"
          description={`Tem certeza que deseja excluir o candidato "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={deleteLoading}
        />
      </div>
    </AppLayout>
  );
};
