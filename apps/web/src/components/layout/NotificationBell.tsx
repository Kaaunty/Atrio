import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  Calendar,
  FileCheck,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ACTION_REQUIRED';
  category: 'PONTO' | 'FERIAS' | 'SOLICITACAO' | 'DOCUMENTO' | 'COMUNICADO' | 'SISTEMA';
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/me/unread-count');
      setUnreadCount(res.data.data?.unreadCount || 0);
    } catch (err) {
      console.error('Erro ao consultar contagem de notificações:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/me', { params: { pageSize: 8 } });
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000); // Polling a cada 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      if (actionUrl) {
        setIsOpen(false);
        navigate(actionUrl);
      }
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/me/mark-all-read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PONTO':
        return <Clock className="w-4 h-4 text-atrio-teal-dark" />;
      case 'FERIAS':
        return <Calendar className="w-4 h-4 text-semantic-info" />;
      case 'SOLICITACAO':
        return <FileText className="w-4 h-4 text-semantic-warning" />;
      case 'DOCUMENTO':
        return <FileCheck className="w-4 h-4 text-semantic-purple" />;
      default:
        return <Info className="w-4 h-4 text-atrio-navy" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Sino no Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-atrio-text-secondary hover:text-atrio-navy hover:bg-atrio-border-light transition-colors focus:outline-none"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-semantic-error text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-atrio-border shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Cabeçalho do Menu */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-atrio-navy to-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-atrio-teal" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Central de Notificações</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-atrio-teal hover:underline flex items-center gap-1 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" /> LER TODAS
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-80 overflow-y-auto divide-y divide-atrio-border/60">
            {loading ? (
              <div className="text-center py-6 text-xs text-atrio-text-secondary">
                <div className="animate-spin w-5 h-5 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
                Carregando avisos...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-atrio-text-secondary">
                Nenhuma notificação no momento.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.actionUrl)}
                  className={`p-3.5 hover:bg-atrio-border-light/40 cursor-pointer transition-colors flex items-start gap-3 ${
                    !n.readAt ? 'bg-atrio-teal-light/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white border border-atrio-border shadow-xs mt-0.5">
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-atrio-navy leading-snug">{n.title}</h4>
                      {!n.readAt && <span className="w-2 h-2 rounded-full bg-atrio-teal" />}
                    </div>
                    <p className="text-[11px] text-atrio-text-secondary leading-relaxed line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {new Date(n.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé do Menu */}
          <div className="p-2 bg-atrio-border-light text-center border-t border-atrio-border">
            <span className="text-[10px] font-semibold text-atrio-text-secondary">
              Alertas multicanal em tempo real
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
