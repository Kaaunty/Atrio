import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Pin,
  Search,
  Megaphone,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface AnnouncementFeedItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  coverImageUrl?: string | null;
  isPinned: boolean;
  requiresAcknowledgement: boolean;
  publishedAt: string;
  authorName: string;
  isRead: boolean;
  isAcknowledged: boolean;
}

export const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const isRhOrAdmin = hasRole('ADMIN', 'RH');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements', {
        params: {
          search: search || undefined,
          category: selectedCategory || undefined,
          pageSize: 20,
        },
      });
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar comunicados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [search, selectedCategory]);

  const categories = [
    { key: '', label: 'Todos os Comunicados' },
    { key: 'INSTITUCIONAL', label: 'Institucional' },
    { key: 'CAMPANHA_RH', label: 'Campanha RH' },
    { key: 'EVENTO', label: 'Eventos' },
    { key: 'BENEFICIOS', label: 'Benefícios' },
    { key: 'IMPORTANTE', label: 'Importante' },
  ];

  return (
    <AppLayout
      title="Mural de Comunicados Internos"
      subtitle="Fique por dentro das principais novidades, eventos e comunicados oficiais da empresa"
    >
      <div className="space-y-6">
        {/* Barra Superior de Busca, Filtros e Ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar comunicado por título ou resumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Chips de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-atrio-navy text-white shadow-xs'
                      : 'bg-white border border-atrio-border text-atrio-text-secondary hover:text-atrio-navy'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Criação para RH */}
          {isRhOrAdmin && (
            <Button variant="primary" onClick={() => navigate('/rh/comunicados/novo')} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Publicar Comunicado
            </Button>
          )}
        </div>

        {/* Grade do Feed de Comunicados */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando comunicados...
          </div>
        ) : announcements.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum comunicado encontrado</h3>
            <p className="text-xs text-atrio-text-secondary">
              Não há publicações recentes na categoria selecionada.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((ann) => (
              <Card
                key={ann.id}
                onClick={() => navigate(`/comunicados/${ann.id}`)}
                className={`flex flex-col justify-between space-y-3 cursor-pointer hover:shadow-md transition-all relative overflow-hidden ${
                  ann.isPinned ? 'border-l-4 border-l-atrio-teal bg-atrio-teal-light/10' : ''
                }`}
              >
                {/* Banner ou Imagem de Capa se Houver */}
                {ann.coverImageUrl && (
                  <div className="-mx-6 -mt-6 mb-2 h-36 overflow-hidden">
                    <img
                      src={ann.coverImageUrl}
                      alt={ann.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ann.isPinned && (
                        <span className="p-1 rounded bg-atrio-teal-light text-atrio-teal-dark" title="Fixado no topo">
                          <Pin className="w-3.5 h-3.5 fill-current" />
                        </span>
                      )}
                      <span className="font-mono text-[10px] font-bold uppercase text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                        {ann.category}
                      </span>
                    </div>

                    {!ann.isRead ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-semantic-error text-white animate-pulse">
                        NÃO LIDO
                      </span>
                    ) : ann.requiresAcknowledgement && ann.isAcknowledged ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-semantic-success-light text-semantic-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> LIDO
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-bold text-base text-atrio-navy leading-snug hover:text-atrio-teal transition-colors">
                    {ann.title}
                  </h3>
                  <p className="text-xs text-atrio-text-secondary leading-relaxed line-clamp-3">
                    {ann.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-atrio-border/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(ann.publishedAt).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <span className="text-atrio-teal font-semibold flex items-center gap-0.5">
                    Ler mais <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
