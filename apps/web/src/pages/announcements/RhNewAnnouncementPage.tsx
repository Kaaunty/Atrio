import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowLeft, Megaphone, Send } from 'lucide-react';
import { api } from '../../services/api';

export const RhNewAnnouncementPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('INSTITUCIONAL');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [targetType, setTargetType] = useState('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(true);

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/rh/announcements', {
        title,
        summary,
        content,
        category,
        coverImageUrl: coverImageUrl || undefined,
        isPinned,
        requiresAcknowledgement,
        targetType,
        targetIds: targetType === 'SPECIFIC_DEPARTMENTS' && selectedDeptId ? [selectedDeptId] : undefined,
        publishedAt: publishedAt || undefined,
        notifyUsers,
      });

      navigate('/comunicados');
    } catch (err) {
      console.error('Erro ao publicar comunicado:', err);
      alert('Erro ao publicar comunicado.');
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                  URL da Imagem de Capa (Banner Opcional)
                </label>
                <Input
                  placeholder="https://exemplo.com/banner.jpg"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                />
              </div>
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
              <Button variant="primary" type="submit" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Publicando...' : 'Publicar Comunicado'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};
