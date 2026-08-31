import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UserCheck, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';

export interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [types, setTypes] = useState<any[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<any | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTypes = async () => {
    try {
      setLoadingTypes(true);
      const res = await api.get('/request-types');
      setTypes(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar tipos de solicitação:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      setStep(1);
      setSelectedType(null);
      setTitle('');
      setDescription('');
      setPriority('MEDIA');
      setFormData({});
      setAttachmentUrl('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleSelectType = (t: any) => {
    setSelectedType(t);
    setTitle(t.name);
    // Inicializa campos padrão
    const initialForm: Record<string, any> = {};
    if (t.formSchema && Array.isArray(t.formSchema)) {
      t.formSchema.forEach((field: any) => {
        if (field.type === 'select' && field.options?.length > 0) {
          initialForm[field.id] = field.options[0];
        } else {
          initialForm[field.id] = '';
        }
      });
    }
    setFormData(initialForm);
    setStep(2);
  };

  const handleFormFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        requestTypeCode: selectedType.code,
        title,
        description: description.trim() ? description : null,
        priority,
        formData,
        attachments: attachmentUrl.trim()
          ? [{ fileName: 'Anexo da Solicitação', fileUrl: attachmentUrl }]
          : [],
      };

      await api.post('/requests', payload);

      setSuccessMsg('Solicitação aberta com sucesso! O fluxo de aprovação foi iniciado.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao abrir solicitação');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'UserCheck':
        return <UserCheck className="w-5 h-5 text-indigo-600" />;
      case 'Clock':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'MessageSquare':
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      default:
        return <FileText className="w-5 h-5 text-atrio-teal" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Abrir Nova Solicitação' : selectedType?.name || 'Preencher Formulário'}
      subtitle={
        step === 1
          ? 'Selecione o tipo de processo ou atendimento desejado'
          : 'Preencha os campos obrigatórios da solicitação'
      }
      maxWidth="xl"
    >
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold">Solicitação Enviada com Sucesso!</h3>
          <p className="text-xs text-emerald-700">{successMsg}</p>
        </div>
      ) : step === 1 ? (
        /* Passo 1: Catálogo de Tipos */
        <div className="space-y-4">
          {loadingTypes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {types.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectType(t)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-atrio-teal hover:bg-teal-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                      {getTypeIcon(t.icon)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-atrio-text-primary group-hover:text-atrio-navy transition-colors">
                        {t.name}
                      </h4>
                      {t.description && (
                        <p className="text-[11px] text-atrio-text-secondary mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Badge variant="neutral" size="sm">
                      {t.category}
                    </Badge>
                    <span className="text-[11px] font-semibold text-atrio-teal flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Continuar <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Passo 2: Formulário Dinâmico e Envio */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
            <span className="text-slate-600">
              Tipo Selecionado: <strong>{selectedType?.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-atrio-teal hover:underline flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3 h-3" /> Alterar Tipo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Título / Assunto da Solicitação *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          {/* Renderização dos Campos Dinâmicos do Schema */}
          {selectedType?.formSchema && Array.isArray(selectedType.formSchema) && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                Informações Específicas
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {selectedType.formSchema.map((field: any) => {
                  if (field.type === 'select') {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                        >
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        <textarea
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          rows={3}
                          className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                        />
                      </div>
                    );
                  }

                  if (field.type === 'date') {
                    return (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                          {field.label} {field.required && '*'}
                        </label>
                        <input
                          type="date"
                          value={formData[field.id] || ''}
                          onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={field.id}>
                      <Input
                        label={`${field.label} ${field.required ? '*' : ''}`}
                        placeholder={field.placeholder || ''}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFormFieldChange(field.id, e.target.value)}
                        required={field.required}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-atrio-text-primary mb-1">
              Observações Adicionais (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informações adicionais para os aprovadores..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
            />
          </div>

          {selectedType?.allowAttachments && (
            <div>
              <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                Link do Documento / Anexo (Opcional)
              </label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Abrindo Solicitação...' : 'Confirmar e Abrir Solicitação'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
