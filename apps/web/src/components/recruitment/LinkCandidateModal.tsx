import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface LinkCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Quando informado, a vaga já vem pré-selecionada (ex: aberto a partir da página de vagas). */
  jobOpeningId?: string;
}

export const LinkCandidateModal: React.FC<LinkCandidateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  jobOpeningId,
}) => {
  const [openings, setOpenings] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  const [selectedOpeningId, setSelectedOpeningId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedOpeningId(jobOpeningId || '');
    setSelectedCandidateId('');
    setNotes('');

    const fetchData = async () => {
      try {
        const [openingsRes, candidatesRes] = await Promise.all([
          api.get('/recruitment/openings', { params: { status: 'ABERTA' } }),
          api.get('/recruitment/candidates'),
        ]);
        setOpenings(openingsRes.data.data || []);
        setCandidates(candidatesRes.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar vagas/candidatos:', err);
      }
    };

    fetchData();
  }, [isOpen, jobOpeningId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOpeningId) {
      setError('Selecione a vaga');
      return;
    }
    if (!selectedCandidateId) {
      setError('Selecione o candidato');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post('/recruitment/applications', {
        jobOpeningId: selectedOpeningId,
        candidateId: selectedCandidateId,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao vincular candidato à vaga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Candidato à Vaga"
      subtitle="A candidatura será criada no estágio inicial de Triagem"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Select
          label="Vaga"
          required
          value={selectedOpeningId}
          onChange={(e) => setSelectedOpeningId(e.target.value)}
          disabled={Boolean(jobOpeningId)}
        >
          <option value="">Selecione a vaga...</option>
          {openings.map((opening) => (
            <option key={opening.id} value={opening.id}>
              {opening.title}
            </option>
          ))}
        </Select>

        <Select
          label="Candidato"
          required
          value={selectedCandidateId}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
        >
          <option value="">Selecione o candidato...</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} ({candidate.email})
            </option>
          ))}
        </Select>

        <Textarea
          label="Observações (opcional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Vinculando...' : 'Vincular Candidato'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
