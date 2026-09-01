import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Inbox, 
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { NewRequestModal } from '../../components/requests/NewRequestModal';
import { api } from '../../services/api';

export const RequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'MY_REQUESTS' | 'INBOX'>('MY_REQUESTS');
  const [items, setItems] = useState<any[]>([]);
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      if (activeTab === 'MY_REQUESTS') {
        const res = await api.get('/requests/me');
        setItems(res.data.items || []);
      } else {
        const res = await api.get('/requests/inbox');
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInboxCount = async () => {
    try {
      const res = await api.get('/requests/inbox');
      setInboxCount(res.data.items?.length || 0);
    } catch (err) {
      // Ignora se não tiver perfil de aprovador
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchInboxCount();
  }, [activeTab]);

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.requestNumber?.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term) ||
      item.requester?.name?.toLowerCase().includes(term) ||
      item.requestType?.name?.toLowerCase().includes(term);
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_GESTOR':
        return <Badge variant="warning" size="sm" dot>Aguardando Gestor</Badge>;
      case 'AGUARDANDO_RH':
        return <Badge variant="info" size="sm" dot>Em Análise RH</Badge>;
      case 'EM_ANDAMENTO':
        return <Badge variant="teal" size="sm" dot>Em Andamento</Badge>;
      case 'ABERTO':
        return <Badge variant="neutral" size="sm" dot>Aberto</Badge>;
      case 'CONCLUIDO':
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Concluído</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
      case 'CANCELADO':
        return <Badge variant="neutral" size="sm">Cancelado</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return <Badge variant="danger" size="sm">Urgente</Badge>;
      case 'ALTA':
        return <Badge variant="warning" size="sm">Alta</Badge>;
      case 'MEDIA':
        return <Badge variant="info" size="sm">Média</Badge>;
      case 'BAIXA':
        return <Badge variant="neutral" size="sm">Baixa</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-atrio-teal" />
              Central de Solicitações
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Abra, acompanhe e delibere processos e solicitações internas com esteiras de aprovação.
            </p>
          </div>

          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Nova Solicitação
          </Button>
        </div>

        {/* Abas Principais & Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-xl border border-atrio-border shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('MY_REQUESTS')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'MY_REQUESTS'
                  ? 'bg-atrio-navy text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Minhas Solicitações
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INBOX')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'INBOX'
                  ? 'bg-atrio-navy text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Aguardando Minha Aprovação</span>
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-atrio-teal text-atrio-navy-dark text-[10px] font-black">
                  {inboxCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por número, título, solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchRequests}
              disabled={loading}
            />
          </div>
        </div>

        {/* Lista de Solicitações */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" className="animate-pulse h-24 bg-slate-100/60" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((req) => (
              <Card
                key={req.id}
                padding="md"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-atrio-teal/40 transition-all cursor-pointer group shadow-sm"
                onClick={() => navigate(`/solicitacoes/${req.id}`)}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                      {req.requestNumber}
                    </span>
                    <h3 className="font-bold text-atrio-text-primary text-sm group-hover:text-atrio-navy transition-colors truncate">
                      {req.title}
                    </h3>
                    {getStatusBadge(req.status)}
                    {getPriorityBadge(req.priority)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>
                      Tipo: <strong className="text-slate-700">{req.requestType?.name}</strong>
                    </span>
                    {activeTab === 'INBOX' && req.requester && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          Solicitante: <strong className="text-slate-700">{req.requester.name}</strong> ({req.requester.department?.name || 'Geral'})
                        </span>
                      </>
                    )}
                    <span className="hidden sm:inline">•</span>
                    <span>Aberta em: {formatDate(req.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-xs text-atrio-teal font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Ver Detalhes <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card padding="lg" className="text-center py-16 text-slate-400 space-y-3">
            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm">
              {activeTab === 'MY_REQUESTS'
                ? 'Você ainda não possui solicitações registradas.'
                : 'Sua caixa de entrada está em dia! Nenhuma solicitação aguarda sua aprovação no momento.'}
            </p>
          </Card>
        )}

        {/* Modal de Abertura */}
        <NewRequestModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => {
            fetchRequests();
            fetchInboxCount();
          }}
        />
      </div>
    </AppLayout>
  );
};
