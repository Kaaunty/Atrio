import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Users, Edit2, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { WorkScheduleModal, WorkScheduleData } from '../../components/time-clock/WorkScheduleModal';
import { api } from '../../services/api';

export const WorkSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<WorkScheduleData | null>(null);

  const [scheduleToDelete, setScheduleToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/work-schedules');
      setSchedules(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar escalas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenCreate = () => {
    setScheduleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sch: any) => {
    setScheduleToEdit(sch);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      setDeleteLoading(true);
      setErrorMsg(null);
      await api.delete(`/work-schedules/${scheduleToDelete.id}`);
      setScheduleToDelete(null);
      await fetchSchedules();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erro ao excluir escala de trabalho');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-atrio-teal" />
              Escalas de Trabalho & Jornadas
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Configure as jornadas contratuais, regras diárias de horários, intervalos e tolerâncias CLT.
            </p>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Nova Escala
          </Button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* Listagem de Escalas */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" className="animate-pulse h-48 bg-slate-100/60" />
            ))}
          </div>
        ) : schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schedules.map((sch) => {
              const employeesCount = sch._count?.employees || 0;

              return (
                <Card
                  key={sch.id}
                  padding="md"
                  className="flex flex-col justify-between hover:border-atrio-teal/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-atrio-text-primary text-base group-hover:text-atrio-navy transition-colors">
                          {sch.name}
                        </h3>
                        {sch.description && (
                          <p className="text-xs text-atrio-text-secondary mt-0.5 line-clamp-2">
                            {sch.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="teal" size="sm">
                        {sch.weeklyHours}h semanais
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-atrio-teal shrink-0" />
                        <span>Tolerância: <strong>{sch.toleranceMinutes} min</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-atrio-teal shrink-0" />
                        <span>Almoço: <strong>{sch.lunchIntervalMinutes} min</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong>{employeesCount}</strong> colaborador(es) vinculado(s)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Edit2 className="w-3.5 h-3.5 text-atrio-navy" />}
                      onClick={() => handleOpenEdit(sch)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      onClick={() => setScheduleToDelete(sch)}
                      className="hover:bg-rose-50 hover:text-rose-700"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card padding="lg" className="text-center py-16 text-slate-400">
            Nenhuma escala de trabalho cadastrada no momento.
          </Card>
        )}

        {/* Modal de Criação / Edição */}
        <WorkScheduleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchSchedules}
          scheduleToEdit={scheduleToEdit}
        />

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmModal
          isOpen={Boolean(scheduleToDelete)}
          onClose={() => setScheduleToDelete(null)}
          onConfirm={handleDelete}
          title="Excluir Escala de Trabalho"
          description={`Tem certeza que deseja excluir a escala "${scheduleToDelete?.name}"? Esta ação só é permitida caso não existam colaboradores vinculados.`}
          confirmText="Excluir Escala"
          variant="danger"
          isLoading={deleteLoading}
        />
      </div>
    </AppLayout>
  );
};
