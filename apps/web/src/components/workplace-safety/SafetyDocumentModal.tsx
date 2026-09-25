import React, { useState, useEffect } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { api } from '../../services/api';

export interface SafetyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document?: any | null;
}

const TYPE_OPTIONS = [
  { value: 'PGR', label: 'PGR - Programa de Gerenciamento de Riscos' },
  { value: 'PCMSO', label: 'PCMSO - Controle Médico de Saúde Ocupacional' },
  { value: 'LTCAT', label: 'LTCAT - Laudo Técnico das Condições Ambientais' },
  { value: 'OUTRO', label: 'Outro' },
];

export const SafetyDocumentModal: React.FC<SafetyDocumentModalProps> = ({ isOpen, onClose, onSuccess, document }) => {
  const isEditing = Boolean(document?.id);

  const [type, setType] = useState('PGR');
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(document?.type || 'PGR');
      setTitle(document?.title || '');
      setFileUrl(document?.fileUrl || '');
      setSelectedFile(null);
      setIssueDate(document?.issueDate ? document.issueDate.split('T')[0] : '');
      setExpiryDate(document?.expiryDate ? document.expiryDate.split('T')[0] : '');
      setActive(document?.active ?? true);
      setError(null);
    }
  }, [isOpen, document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      let uploadedFileUrl = fileUrl;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await api.post('/workplace-safety/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedFileUrl = uploadResponse.data?.data?.fileUrl || '';
      }

      if (!uploadedFileUrl) {
        throw new Error('Selecione um arquivo para o documento');
      }

      const payload = {
        type,
        title,
        fileUrl: uploadedFileUrl,
        issueDate,
        expiryDate: expiryDate || null,
        active,
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/documents/${document.id}`, payload);
      } else {
        await api.post('/workplace-safety/documents', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro ao salvar documento de SST');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Documento de SST' : 'Novo Documento de SST'}
      subtitle="PGR, PCMSO, LTCAT e outros documentos obrigatórios"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Select label="Tipo de Documento" value={type} onChange={(e) => setType(e.target.value)} required options={TYPE_OPTIONS} />

        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Programa de Gerenciamento de Riscos 2026" />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Arquivo {!isEditing && <span className="text-rose-500">*</span>}
          </label>
          <label className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-atrio-border bg-white text-sm text-slate-600 cursor-pointer hover:border-atrio-teal transition-colors">
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{selectedFile?.name || (fileUrl ? 'Arquivo atual mantido' : 'Selecionar arquivo')}</span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              required={!isEditing && !fileUrl}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </label>
          <p className="text-[11px] text-slate-400">PDF, Word, Excel ou imagem (até 30 MB).</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Data de Emissão" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          <Input label="Data de Validade" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Documento ativo
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Documento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
