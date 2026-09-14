import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  ArrowLeft,
  Megaphone,
  Send,
  UploadCloud,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { compressImage } from '../../utils/imageCompression';

export const RhNewAnnouncementPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('INSTITUCIONAL');
  const [isPinned, setIsPinned] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [targetType, setTargetType] = useState('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);

  // Estado do Arquivo / Banner de Capa
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar departamentos:', err);
      }
    };
    fetchDepts();
  }, []);

  const handleFileSelect = async (file: File) => {
    setError(null);
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      setError('O tamanho da imagem excede o limite máximo permitido de 15MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Formato inválido. Por favor, envie uma imagem (JPG, PNG ou WEBP).');
      return;
    }

    try {
      setIsCompressing(true);
      const result = await compressImage(file, {
        maxWidth: 2048,
        maxHeight: 1200,
        quality: 0.84,
      });

      setSelectedFile(result.file);
      setFilePreview(result.previewUrl);
    } catch (err) {
      console.warn('Erro ao otimizar imagem, utilizando original:', err);
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      let coverImageUrl: string | undefined = undefined;

      // 1. Upload da Capa (se selecionada)
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await api.post('/rh/announcements/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        coverImageUrl = uploadRes.data?.data?.fileUrl;
      }

      // 2. Publicação do Comunicado
      await api.post('/rh/announcements', {
        title,
        summary,
        content,
        category,
        coverImageUrl,
        isPinned,
        requiresAcknowledgement,
        targetType,
        targetIds: targetType === 'SPECIFIC_DEPARTMENTS' && selectedDeptId ? [selectedDeptId] : undefined,
        publishedAt: publishedAt || undefined,
        notifyUsers,
      });

      navigate('/comunicados');
    } catch (err: any) {
      console.error('Erro ao publicar comunicado:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao publicar comunicado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Novo Comunicado Interno"
      subtitle="Publique notícias, avisos institucionais e campanhas com agendamento e público-alvo"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="secondary" size="sm" onClick={() => navigate('/comunicados')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Mural
        </Button>

        <Card className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-atrio-border pb-4">
            <div className="p-2.5 rounded-xl bg-atrio-teal-light text-atrio-teal-dark">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-atrio-navy">Formulário de Publicação</h2>
              <p className="text-xs text-atrio-text-secondary">
                Preencha os campos abaixo para disponibilizar o comunicado aos colaboradores.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Título do Comunicado *
              </label>
              <Input
                required
                placeholder="Ex: Convenção Anual Átrio 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Resumo Curto (para cards e notificações) *
              </label>
              <Input
                required
                placeholder="Ex: Participe da convenção anual com toda a equipe da Átrio RH..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Categoria *
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'INSTITUCIONAL', label: 'Institucional' },
                  { value: 'CAMPANHA_RH', label: 'Campanha RH' },
                  { value: 'EVENTO', label: 'Eventos / Convenção' },
                  { value: 'BENEFICIOS', label: 'Benefícios & Convênios' },
                  { value: 'IMPORTANTE', label: 'Urgente / Importante' },
                ]}
              />
            </div>

            {/* Imagem de Capa (Banner Upload) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-atrio-text-secondary">
                Imagem de Capa (Banner Opcional)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg,image/heic"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-atrio-teal bg-teal-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-atrio-teal hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 bg-atrio-teal/10 text-atrio-teal rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Clique para selecionar ou arraste o banner do comunicado aqui
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Formatos aceitos: JPG, PNG ou WEBP (Tamanho máx: 15MB)
                  </p>
                </div>
              ) : isCompressing ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin text-atrio-teal" />
                  <p className="text-xs font-bold">Processando imagem...</p>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Prévia do banner"
                        className="w-16 h-12 object-cover rounded-xl border border-slate-200 shrink-0 bg-white"
                      />
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatFileSize(selectedFile.size)}
                      </p>

                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Banner pronto para publicação
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs h-8 px-2.5"
                    >
                      Alterar
                    </Button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remover banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Conteúdo Completo (Suporta texto formatado) *
              </label>
              <textarea
                required
                rows={8}
                placeholder="Escreva a mensagem completa do comunicado aqui..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 text-xs bg-atrio-bg border border-atrio-border rounded-xl text-atrio-text-primary focus:outline-none focus:ring-1 focus:ring-atrio-teal font-sans leading-relaxed"
              />
            </div>

            {/* Segmentação & Agendamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-atrio-bg rounded-xl border border-atrio-border">
              <div>
                <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                  Público-Alvo
                </label>
                <Select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'Toda a Empresa (Global)' },
                    { value: 'SPECIFIC_DEPARTMENTS', label: 'Departamento Específico' },
                  ]}
                />
              </div>

              {targetType === 'SPECIFIC_DEPARTMENTS' && (
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Selecione o Departamento
                  </label>
                  <Select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecione um Departamento...' },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                  Data e Hora de Publicação Programada
                </label>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            </div>

            {/* Opções de Engajamento */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-atrio-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-atrio-teal focus:ring-atrio-teal"
                />
                Fixar no topo do mural de comunicados
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-atrio-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresAcknowledgement}
                  onChange={(e) => setRequiresAcknowledgement(e.target.checked)}
                  className="rounded text-atrio-teal focus:ring-atrio-teal"
                />
                Exigir confirmação de ciência/leitura dos colaboradores
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-atrio-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="rounded text-atrio-teal focus:ring-atrio-teal"
                />
                Enviar notificação in-app automática aos colaboradores elegíveis
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-atrio-border">
              <Button variant="secondary" type="button" onClick={() => navigate('/comunicados')}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={submitting || isCompressing} className="flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Publicando...' : 'Publicar Comunicado'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};
