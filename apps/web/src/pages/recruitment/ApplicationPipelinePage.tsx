import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, UserPlus, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { LinkCandidateModal } from '../../components/recruitment/LinkCandidateModal';

// Espelha o STAGE_FLOW server-side (apps/api/.../services/applications.service.ts).
// APROVADO e REPROVADO são estágios finais, sem transições de saída.
const STAGE_FLOW: Record<string, string[]> = {
  TRIAGEM: ['ENTREVISTA', 'REPROVADO'],
  ENTREVISTA: ['AVALIACAO', 'TRIAGEM', 'REPROVADO'],
  AVALIACAO: ['PARECER', 'ENTREVISTA', 'REPROVADO'],
  PARECER: ['APROVADO', 'REPROVADO', 'AVALIACAO'],
  APROVADO: [],
  REPROVADO: [],
};

const STAGES: { key: string; label: string; accent: string }[] = [
  { key: 'TRIAGEM', label: 'Triagem', accent: 'border-t-slate-400' },
  { key: 'ENTREVISTA', label: 'Entrevista', accent: 'border-t-blue-500' },
  { key: 'AVALIACAO', label: 'Avaliação', accent: 'border-t-indigo-500' },
  { key: 'PARECER', label: 'Parecer', accent: 'border-t-amber-500' },
  { key: 'APROVADO', label: 'Aprovado', accent: 'border-t-emerald-500' },
  { key: 'REPROVADO', label: 'Reprovado', accent: 'border-t-rose-500' },
];

const STAGE_LABEL: Record<string, string> = STAGES.reduce((acc, s) => ({ ...acc, [s.key]: s.label }), {});

export const ApplicationPipelinePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('recrutamento.gerenciar');

  const [applications, setApplications] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [openingFilter, setOpeningFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showLinkModal, setShowLinkModal] = useState(false);

  const [moveTarget, setMoveTarget] = useState<any | null>(null);
  const [moveToStage, setMoveToStage] = useState<string | null>(null);
  const [moveNotes, setMoveNotes] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [applicationsRes, openingsRes] = await Promise.all([
        api.get('/recruitment/applications', {
          params: openingFilter ? { jobOpeningId: openingFilter } : undefined,
        }),
        api.get('/recruitment/openings'),
      ]);
      setApplications(applicationsRes.data.data || []);
      setOpenings(openingsRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar pipeline de candidaturas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openingFilter]);

  const columns = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    STAGES.forEach((s) => {
      grouped[s.key] = [];
    });
    applications.forEach((app) => {
      if (!grouped[app.stage]) grouped[app.stage] = [];
      grouped[app.stage].push(app);
    });
    return grouped;
  }, [applications]);

  const openMove = (application: any, stage: string) => {
    setMoveTarget(application);
    setMoveToStage(stage);
    setMoveNotes('');
    setMoveError(null);
  };

  const handleConfirmMove = async () => {
    if (!moveTarget || !moveToStage) return;
    try {
      setMoveLoading(true);
      setMoveError(null);
      await api.patch(`/recruitment/applications/${moveTarget.id}/stage`, {
        stage: moveToStage,
        notes: moveNotes.trim() || undefined,
      });
      setMoveTarget(null);
      setMoveToStage(null);
      await fetchData();
    } catch (err: any) {
      setMoveError(err.response?.data?.message || 'Erro ao mover candidatura');
    } finally {
      setMoveLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-6 h-6 text-atrio-teal" />
              Pipeline de Candidaturas
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Acompanhe candidatos ao longo do funil de seleção, respeitando as transições válidas de cada etapa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchData}
              disabled={loading}
            >
              Atualizar
            </Button>
            {canManage && (
              <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowLinkModal(true)}>
                Vincular Candidato
              </Button>
            )}
          </div>
        </div>

        <Card padding="md">
          <div className="max-w-xs">
            <Select
              label="Filtrar por Vaga"
              value={openingFilter}
              onChange={(e) => setOpeningFilter(e.target.value)}
            >
              <option value="">Todas as vagas</option>
              {openings.map((opening) => (
                <option key={opening.id} value={opening.id}>
                  {opening.title}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {STAGES.map((stageInfo) => (
            <div
              key={stageInfo.key}
              className={`bg-slate-50/60 rounded-xl border border-slate-200 border-t-4 ${stageInfo.accent} flex flex-col min-h-[200px]`}
            >
              <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-atrio-text-primary uppercase tracking-wide">
                  {stageInfo.label}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                  {columns[stageInfo.key]?.length || 0}
                </span>
              </div>

              <div className="p-2.5 space-y-2 flex-1 overflow-y-auto max-h-[560px]">
                {(columns[stageInfo.key] || []).map((application) => {
                  const nextStages = STAGE_FLOW[application.stage] || [];
                  const forward = nextStages.filter((s) => s !== 'REPROVADO' && s !== application.stage);
                  const canReject = nextStages.includes('REPROVADO');
                  const backward = nextStages.filter(
                    (s) => s !== 'REPROVADO' && !forward.includes(s)
                  );

                  return (
                    <div
                      key={application.id}
                      className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-2 shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{application.candidate?.name}</p>
                        <p className="text-slate-500">{application.jobOpening?.title}</p>
                      </div>

                      {canManage && nextStages.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100">
                          {backward.map((stage) => (
                            <Button
                              key={stage}
                              variant="ghost"
                              size="sm"
                              icon={<ArrowLeft className="w-3 h-3" />}
                              onClick={() => openMove(application, stage)}
                              className="!px-1.5 !py-1 text-[10px]"
                            >
                              {STAGE_LABEL[stage]}
                            </Button>
                          ))}
                          {forward.map((stage) => (
                            <Button
                              key={stage}
                              variant="teal"
                              size="sm"
                              icon={<ArrowRight className="w-3 h-3" />}
                              onClick={() => openMove(application, stage)}
                              className="!px-1.5 !py-1 text-[10px]"
                            >
                              {STAGE_LABEL[stage]}
                            </Button>
                          ))}
                          {canReject && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => openMove(application, 'REPROVADO')}
                              className="!px-1.5 !py-1 text-[10px]"
                            >
                              Reprovar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {(columns[stageInfo.key] || []).length === 0 && (
                  <div className="py-6 text-center text-slate-300 text-[10px]">Vazio</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <LinkCandidateModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onSuccess={fetchData}
        />

        <Modal
          isOpen={Boolean(moveTarget && moveToStage)}
          onClose={() => {
            setMoveTarget(null);
            setMoveToStage(null);
          }}
          title={`Mover para ${moveToStage ? STAGE_LABEL[moveToStage] : ''}`}
          maxWidth="sm"
        >
          {moveTarget && (
            <div className="space-y-4">
              {moveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{moveError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Candidato: <strong>{moveTarget.candidate?.name}</strong>
                <br />
                De <strong>{STAGE_LABEL[moveTarget.stage]}</strong> para{' '}
                <strong>{moveToStage ? STAGE_LABEL[moveToStage] : ''}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">Observações (opcional)</label>
                <textarea
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMoveTarget(null);
                    setMoveToStage(null);
                  }}
                  disabled={moveLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant={moveToStage === 'REPROVADO' ? 'danger' : 'primary'}
                  size="sm"
                  onClick={handleConfirmMove}
                  disabled={moveLoading}
                >
                  {moveLoading ? 'Movendo...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
};
