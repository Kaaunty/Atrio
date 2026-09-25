import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  candidate?: any | null;
}

export const CandidateModal: React.FC<CandidateModalProps> = ({ isOpen, onClose, onSuccess, candidate }) => {
  const isEdit = Boolean(candidate?.id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [source, setSource] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    if (isEdit && candidate) {
      setName(candidate.name || '');
      setEmail(candidate.email || '');
      setPhone(candidate.phone || '');
      setResumeUrl(candidate.resumeUrl || '');
      setEducation(candidate.education || '');
      setExperience(candidate.experience || '');
      setSource(candidate.source || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setResumeUrl('');
      setEducation('');
      setExperience('');
      setSource('');
    }
  }, [isOpen, isEdit, candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 3) {
      setError('O nome do candidato deve ter pelo menos 3 caracteres');
      return;
    }
    if (!email.trim()) {
      setError('O e-mail do candidato é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        resumeUrl: resumeUrl.trim() || undefined,
        education: education.trim() || undefined,
        experience: experience.trim() || undefined,
        source: source.trim() || undefined,
      };

      if (isEdit) {
        await api.patch(`/recruitment/candidates/${candidate.id}`, payload);
      } else {
        await api.post('/recruitment/candidates', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar candidato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Candidato' : 'Cadastrar Candidato'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome Completo" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            label="Fonte de Origem"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="LinkedIn, indicação, site..."
          />
        </div>

        <Input
          label="URL do Currículo"
          value={resumeUrl}
          onChange={(e) => setResumeUrl(e.target.value)}
          placeholder="https://..."
        />

        <Textarea
          label="Formação"
          rows={2}
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        />

        <Textarea
          label="Experiência"
          rows={3}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Candidato'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
