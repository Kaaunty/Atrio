import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Pin,
  CheckSquare,
} from 'lucide-react';
import { api } from '../../services/api';

interface AnnouncementDetail {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverImageUrl?: string | null;
  attachments?: { name: string; url: string; size?: number }[] | null;
  isPinned: boolean;
  requiresAcknowledgement: boolean;
  publishedAt: string;
  author: {
    id: string;
    email: string;
    employee?: { name: string } | null;
  };
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: string | null;
}

export const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.get(`/announcements/${id}`);
        setAnnouncement(res.data.data);
      } catch (err) {
        console.error('Erro ao carregar detalhes do comunicado:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleAcknowledge = async () => {
    if (!id || !announcement) return;
    try {
      setAcknowledging(true);
      await api.post(`/announcements/${id}/acknowledge`);
      setAnnouncement({
        ...announcement,
        isAcknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Erro ao confirmar ciência:', err);
      alert('Erro ao registrar ciência.');
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <AppLayout
      title="Leitura de Comunicado"
      subtitle="Detalhes oficiais e confirmação de ciência de comunicado corporativo"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Botão de Voltar */}
        <Button variant="secondary" size="sm" onClick={() => navigate('/comunicados')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Mural
        </Button>

        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando comunicado...
          </div>
        ) : !announcement ? (
          <Card className="text-center py-12 text-atrio-text-secondary text-sm">
            Comunicado não encontrado.
          </Card>
        ) : (
          <Card className="space-y-6 overflow-hidden p-6 sm:p-8">
            {/* Banner de Capa */}
            {announcement.coverImageUrl && (
              <div className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-4 h-64 sm:h-80 overflow-hidden">
                <img
                  src={announcement.coverImageUrl}
                  alt={announcement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Cabeçalho do Comunicado */}
            <div className="space-y-3 border-b border-atrio-border pb-4">
              <div className="flex items-center gap-2">
                {announcement.isPinned && (
                  <span className="p-1 rounded bg-atrio-teal-light text-atrio-teal-dark" title="Fixado no topo">
                    <Pin className="w-4 h-4 fill-current" />
                  </span>
                )}
                <span className="font-mono text-xs font-bold uppercase text-atrio-teal-dark bg-atrio-teal-light px-2.5 py-1 rounded">
                  {announcement.category}
                </span>
                <span className="text-xs text-atrio-text-secondary flex items-center gap-1 ml-auto">
                  <Calendar className="w-3.5 h-3.5" />
                  Publicado em {new Date(announcement.publishedAt).toLocaleDateString('pt-BR')} por{' '}
                  <strong className="text-atrio-navy">
                    {announcement.author.employee?.name || announcement.author.email}
                  </strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-atrio-navy leading-tight">
                {announcement.title}
              </h1>
              <p className="text-sm text-atrio-text-secondary leading-relaxed font-medium">
                {announcement.summary}
              </p>
            </div>

            {/* Conteúdo Principal do Comunicado */}
            <div className="prose prose-slate max-w-none text-sm text-atrio-text-primary leading-relaxed space-y-4 whitespace-pre-wrap">
              {announcement.content}
            </div>

            {/* Anexos se Houver */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div className="pt-4 border-t border-atrio-border space-y-2">
                <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider">Anexos para Download</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {announcement.attachments.map((att, aIdx) => (
                    <a
                      key={aIdx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-atrio-border hover:bg-atrio-border-light transition-colors text-xs text-atrio-navy font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-atrio-teal-dark" />
                        <span className="truncate">{att.name}</span>
                      </div>
                      <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Caixa de Confirmação de Leitura / Ciência */}
            {announcement.requiresAcknowledgement && (
              <div className="pt-6 border-t border-atrio-border">
                {announcement.isAcknowledged ? (
                  <div className="p-4 rounded-xl bg-semantic-success-light border border-semantic-success/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-semantic-success">
                      <CheckCircle2 className="w-6 h-6" />
                      <div>
                        <p className="font-bold text-xs">Leitura e Ciência Confirmada</p>
                        <p className="text-[11px] opacity-90">
                          Registrado em{' '}
                          {new Date(announcement.acknowledgedAt!).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-atrio-teal-light/30 border border-atrio-teal/30 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckSquare className="w-5 h-5 text-atrio-teal-dark shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-atrio-navy">Confirmação de Ciência Obrigatória</h4>
                        <p className="text-xs text-atrio-text-secondary mt-0.5">
                          Este comunicado exige confirmação explícita de leitura. Clique no botão abaixo para registrar sua ciência junto ao setor de Recursos Humanos.
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="w-full sm:w-auto"
                      disabled={acknowledging}
                      onClick={handleAcknowledge}
                    >
                      {acknowledging ? 'Confirmando...' : 'Confirmar Ciência e Leitura'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
