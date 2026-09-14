import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  Calendar,
  FileCheck,
  Info,
  Search,
  ExternalLink,
  Filter,
  Megaphone,
} from 'lucide-react';
import { api } from '../../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED';
  category: 'PONTO' | 'FERIAS' | 'SOLICITACAO' | 'DOCUMENTO' | 'COMUNICADO' | 'SISTEMA';
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/me', {
        params: {
          pageSize: 100,
        },
      });
      const data: NotificationItem[] = res.data.data || [];
      setNotifications(data);

      const unread = data.filter((n) => !n.readAt).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/me/mark-all-read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.readAt) {
      handleMarkAsRead(item.id);
    }
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PONTO':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'FERIAS':
        return <Calendar className="w-5 h-5 text-sky-600" />;
      case 'SOLICITACAO':
        return <FileText className="w-5 h-5 text-indigo-600" />;
      case 'DOCUMENTO':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'COMUNICADO':
        return <Megaphone className="w-5 h-5 text-purple-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ACTION_REQUIRED':
        return <Badge variant="warning">Ação Necessária</Badge>;
      case 'WARNING':
        return <Badge variant="danger">Atenção</Badge>;
      case 'SUCCESS':
        return <Badge variant="success">Sucesso</Badge>;
      case 'INFO':
      default:
        return <Badge variant="info">Informativo</Badge>;
    }
  };

  // Filtragem dos itens
  const filteredNotifications = notifications.filter((n) => {
    // Filtro por Tab (Todas / Não Lidas / Lidas)
    if (filterTab === 'UNREAD' && n.readAt) return false;
    if (filterTab === 'READ' && !n.readAt) return false;

    // Filtro por Categoria
    if (selectedCategory !== 'ALL' && n.category !== selectedCategory) return false;

    // Filtro por Busca de Texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchMsg = n.message.toLowerCase().includes(term);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  const categoriesList = [
    { value: 'ALL', label: 'Todas as Categorias' },
    { value: 'PONTO', label: 'Ponto & Ajustes' },
    { value: 'FERIAS', label: 'Férias' },
    { value: 'SOLICITACAO', label: 'Solicitações' },
    { value: 'DOCUMENTO', label: 'Documentos' },
    { value: 'COMUNICADO', label: 'Comunicados' },
    { value: 'SISTEMA', label: 'Sistema' },
  ];

  return (
    <AppLayout
      title="Central de Notificações"
      subtitle="Acompanhe avisos, pendências, comunicações institucionais e alertas do sistema em tempo real"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Banner do Topo com Glassmorphism */}
        <div className="bg-gradient-to-r from-atrio-navy to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-atrio-teal/10 rounded-l-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-atrio-teal mb-3">
                <Bell className="w-4 h-4 shrink-0" />
                <span>Central de Alertas e Notificações In-App</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Notificações e Pendências
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Gerencie seus comunicados, solicitações de homologação, solicitações de ponto e avisos internos.
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleMarkAllAsRead}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-atrio-teal hover:bg-atrio-teal-dark text-atrio-navy-dark font-bold shadow-lg shadow-atrio-teal/20 border-0"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar Todas como Lidas
              </Button>
            )}
          </div>
        </div>

        {/* Filtros e Barra de Ações */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Tabs: Todas / Não Lidas / Lidas */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto self-start">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-white text-atrio-navy shadow-xs'
                    : 'text-slate-600 hover:text-atrio-navy'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilterTab('UNREAD')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterTab === 'UNREAD'
                    ? 'bg-white text-atrio-navy shadow-xs'
                    : 'text-slate-600 hover:text-atrio-navy'
                }`}
              >
                Não Lidas
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-atrio-teal text-atrio-navy-dark font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterTab('READ')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'READ'
                    ? 'bg-white text-atrio-navy shadow-xs'
                    : 'text-slate-600 hover:text-atrio-navy'
                }`}
              >
                Lidas ({notifications.length - unreadCount})
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-sans"
              />
            </div>
          </div>

          {/* Categorias em Pílulas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
            <span className="text-slate-400 text-xs font-semibold flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            {categoriesList.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-atrio-navy text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Lista de Notificações */}
        <div className="space-y-3">
          {loading ? (
            <Card className="p-12 text-center text-slate-400 text-sm">
              <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-3" />
              Carregando notificações...
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 text-sm space-y-2">
              <Bell className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-base">Nenhuma notificação encontrada</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum resultado corresponde aos termos da sua pesquisa.'
                  : filterTab === 'UNREAD'
                  ? 'Você já visualizou todas as suas notificações pendentes!'
                  : 'Você não possui notificações cadastradas nesta categoria.'}
              </p>
            </Card>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = !item.readAt;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    isUnread
                      ? 'bg-white border-atrio-teal/40 shadow-md ring-1 ring-atrio-teal/20'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`p-3 rounded-2xl shrink-0 ${
                        isUnread ? 'bg-atrio-teal/10' : 'bg-slate-100'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnread && (
                          <span className="inline-block w-2 h-2 rounded-full bg-atrio-teal shrink-0" />
                        )}
                        <h3 className={`text-sm font-bold ${isUnread ? 'text-atrio-navy' : 'text-slate-700'}`}>
                          {item.title}
                        </h3>
                        {getTypeBadge(item.type)}
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                          {item.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed break-words">
                        {item.message}
                      </p>

                      <div className="text-[11px] text-slate-400 font-medium pt-1">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        às{' '}
                        {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.actionUrl && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(item);
                        }}
                        className="text-xs flex items-center gap-1.5 bg-atrio-navy hover:bg-slate-800"
                      >
                        <span>Acessar</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {isUnread && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="text-xs text-slate-600 hover:text-atrio-navy"
                        title="Marcar como lida"
                      >
                        <CheckCheck className="w-4 h-4 mr-1 text-atrio-teal" />
                        Lida
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};
