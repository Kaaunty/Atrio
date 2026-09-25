import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  interview?: any | null;
  /** Quando informado, a candidatura já vem pré-selecionada. */
  applicationId?: string;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  interview,
  applicationId,
}) => {
  const isEdit = Boolean(interview?.id);

  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [location, setLocation] = useState('');
  const [feedback, setFeedback] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (isEdit && interview) {
      setSelectedApplicationId(interview.applicationId || '');
      setScheduledAt(interview.scheduledAt ? toLocalDatetimeInput(interview.scheduledAt) : '');
      const firstInterviewer = Array.isArray(interview.interviewers) ? interview.interviewers[0] : null;
      setInterviewerName(firstInterviewer?.name || '');
      setLocation(interview.location || '');
      setFeedback(interview.feedback || '');
    } else {
      setSelectedApplicationId(applicationId || '');
      setScheduledAt('');
      setInterviewerName('');
      setLocation('');
      setFeedback('');
    }

    if (!isEdit && !applicationId) {
      const fetchApplications = async () => {
        try {
          const res = await api.get('/recruitment/applications', {
            params: { stage: 'TRIAGEM' },
          });
          setApplications(res.data.data || []);
        } catch (err) {
          console.error('Erro ao carregar candidaturas:', err);
        }
      };
      fetchApplications();
    }
  }, [isOpen, isEdit, interview, applicationId]);

  const toLocalDatetimeInput = (isoStr: string) => {
    const date = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !selectedApplicationId) {
      setError('Selecione a candidatura');
      return;
    }
    if (!scheduledAt) {
      setError('Informe a data e hora da entrevista');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const interviewers = interviewerName.trim()
        ? [{ employeeId: 'manual', name: interviewerName.trim() }]
        : undefined;

      if (isEdit) {
        await api.patch(`/recruitment/interviews/${interview.id}`, {
          scheduledAt: new Date(scheduledAt).toISOString(),
          interviewers,
          location: location.trim() || undefined,
          feedback: feedback.trim() || undefined,
        });
      } else {
        await api.post('/recruitment/interviews', {
          applicationId: selectedApplicationId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          interviewers,
          location: location.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar entrevista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Entrevista' : 'Agendar Entrevista'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isEdit && !applicationId && (
          <Select
            label="Candidatura"
            required
            value={selectedApplicationId}
            onChange={(e) => setSelectedApplicationId(e.target.value)}
          >
            <option value="">Selecione a candidatura...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.candidate?.name} — {app.jobOpening?.title}
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Data e Hora"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />

        <Input
          label="Entrevistador(a)"
          value={interviewerName}
          onChange={(e) => setInterviewerName(e.target.value)}
          placeholder="Nome do responsável pela entrevista"
        />

        <Input
          label="Local / Link"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Sala de reuniões, link de videochamada..."
        />

        {isEdit && (
          <Textarea
            label="Feedback (opcional)"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Agendar Entrevista'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
