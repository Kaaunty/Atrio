import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Edit2, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SafetyDocumentModal } from '../../components/workplace-safety/SafetyDocumentModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  PGR: 'PGR',
  PCMSO: 'PCMSO',
  LTCAT: 'LTCAT',
  OUTRO: 'Outro',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function isExpiringSoon(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

function isExpired(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() < Date.now();
}

export const SafetyDocumentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/workplace-safety/documents');
      setDocuments(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar documentos de SST');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/documents/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir documento');
    } finally {
      setDeleting(false);
    }
  };

  const expiringCount = documents.filter((d) => d.active && isExpiringSoon(d.expiryDate)).length;
  const expiredCount = documents.filter((d) => d.active && isExpired(d.expiryDate)).length;
  const activeCount = documents.filter((d) => d.active).length;

  return (
    <AppLayout title="Documentos de SST" subtitle="PGR, PCMSO, LTCAT e demais documentos obrigatórios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-atrio-navy/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-atrio-navy" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">Documentos de SST</h1>
              <p className="text-xs text-slate-500">Programas e laudos obrigatórios</p>
            </div>
          </div>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingDocument(null);
                setModalOpen(true);
              }}
            >
              Novo Documento
            </Button>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="text-xs text-slate-500">Documentos Ativos</p>
            <p className="text-xl font-bold text-atrio-navy">{activeCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Vencendo em 30 dias</p>
            <p className="text-xl font-bold text-amber-600">{expiringCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Vencidos</p>
            <p className="text-xl font-bold text-rose-600">{expiredCount}</p>
          </Card>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
          ) : documents.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhum documento cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-atrio-border text-left text-xs text-slate-500">
                    <th className="p-3 font-semibold">Título</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Emissão</th>
                    <th className="p-3 font-semibold">Validade</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-atrio-border last:border-0">
                      <td className="p-3 font-medium text-atrio-navy">
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-atrio-teal">
                          {d.title}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3">
                        <Badge variant="info" size="sm">
                          {TYPE_LABELS[d.type] || d.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">{formatDate(d.issueDate)}</td>
                      <td className="p-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          {formatDate(d.expiryDate)}
                          {d.active && isExpired(d.expiryDate) && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                          {d.active && isExpiringSoon(d.expiryDate) && !isExpired(d.expiryDate) && (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={d.active ? 'success' : 'neutral'} size="sm">
                          {d.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingDocument(d);
                                setModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(d)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <SafetyDocumentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} document={editingDocument} />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Documento"
        description="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default SafetyDocumentsPage;
