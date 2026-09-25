import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CipaMemberModal } from '../../components/workplace-safety/CipaMemberModal';
import { CipaMeetingModal } from '../../components/workplace-safety/CipaMeetingModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  REPRESENTANTE_EMPREGADOR: 'Representante do Empregador',
  REPRESENTANTE_EMPREGADO: 'Representante do Empregado',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export const CipaPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [activeTab, setActiveTab] = useState('members');

  const [members, setMembers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<any | null>(null);

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any | null>(null);
  const [deleteMeetingTarget, setDeleteMeetingTarget] = useState<any | null>(null);

  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [membersRes, meetingsRes] = await Promise.all([
        api.get('/workplace-safety/cipa/members', { params: { active: true } }),
        api.get('/workplace-safety/cipa/meetings'),
      ]);
      setMembers(membersRes.data.data || []);
      setMeetings(meetingsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados da CIPA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/cipa/members/${deleteMemberTarget.id}`);
      setDeleteMemberTarget(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir membro');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeetingTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/cipa/meetings/${deleteMeetingTarget.id}`);
      setDeleteMeetingTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir reunião');
    } finally {
      setDeleting(false);
    }
  };

  const activeMembers = members.filter((m) => m.active).length;

  return (
    <AppLayout title="CIPA" subtitle="Comissão Interna de Prevenção de Acidentes — membros e reuniões">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-atrio-navy/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-atrio-navy" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">CIPA</h1>
              <p className="text-xs text-slate-500">{activeMembers} membro(s) ativo(s) · {meetings.length} reunião(ões)</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {activeTab === 'members' ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingMember(null);
                    setMemberModalOpen(true);
                  }}
                >
                  Novo Membro
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingMeeting(null);
                    setMeetingModalOpen(true);
                  }}
                >
                  Nova Reunião
                </Button>
              )}
            </div>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <Tabs
          tabs={[
            { id: 'members', label: 'Membros' },
            { id: 'meetings', label: 'Reuniões' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'members' ? (
          <Card padding="none">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Nenhum membro cadastrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-atrio-border text-left text-xs text-slate-500">
                      <th className="p-3 font-semibold">Colaborador</th>
                      <th className="p-3 font-semibold">Função</th>
                      <th className="p-3 font-semibold">Mandato</th>
                      <th className="p-3 font-semibold">Status</th>
                      {canManage && <th className="p-3 font-semibold text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-atrio-border last:border-0">
                        <td className="p-3 font-medium text-atrio-navy">{m.employee?.name || '-'}</td>
                        <td className="p-3 text-slate-600">{ROLE_LABELS[m.role] || m.role}</td>
                        <td className="p-3 text-slate-600">
                          {formatDate(m.termStart)} - {formatDate(m.termEnd)}
                        </td>
                        <td className="p-3">
                          <Badge variant={m.active ? 'success' : 'neutral'} size="sm">
                            {m.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        {canManage && (
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingMember(m);
                                  setMemberModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteMemberTarget(m)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                              >
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
        ) : (
          <Card padding="none">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
            ) : meetings.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Nenhuma reunião registrada.</div>
            ) : (
              <div className="divide-y divide-atrio-border">
                {meetings.map((mt) => (
                  <div key={mt.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">{formatDate(mt.meetingDate)}</p>
                        <p className="text-sm text-atrio-navy mt-1">{mt.minutes}</p>
                        {Array.isArray(mt.pendingActions) && mt.pendingActions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {mt.pendingActions.map((pa: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <Badge variant={pa.done ? 'success' : 'warning'} size="sm" dot>
                                  {pa.done ? 'Concluída' : 'Pendente'}
                                </Badge>
                                <span className="text-slate-600">{pa.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingMeeting(mt);
                              setMeetingModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteMeetingTarget(mt)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <CipaMemberModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onSuccess={fetchData}
        member={editingMember}
      />
      <CipaMeetingModal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onSuccess={fetchData}
        meeting={editingMeeting}
      />
      <ConfirmModal
        isOpen={Boolean(deleteMemberTarget)}
        onClose={() => setDeleteMemberTarget(null)}
        onConfirm={handleDeleteMember}
        title="Excluir Membro"
        description="Tem certeza que deseja excluir este membro da CIPA?"
        variant="danger"
        isLoading={deleting}
      />
      <ConfirmModal
        isOpen={Boolean(deleteMeetingTarget)}
        onClose={() => setDeleteMeetingTarget(null)}
        onConfirm={handleDeleteMeeting}
        title="Excluir Reunião"
        description="Tem certeza que deseja excluir esta reunião da CIPA?"
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default CipaPage;
