import React, { useState } from 'react';
import {
  UserCheck,
  Briefcase,
  Layers,
  Users,
  TrendingUp,
  Sun,
  AlertTriangle,
  UserMinus,
  Info,
  Plus,
  Calendar,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  EmployeeHistory,
  TimelineEventType,
  employeeService,
} from '../../services/employeeService';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

interface EmployeeTimelineProps {
  employeeId: string;
  timeline: EmployeeHistory[];
  onRefresh: () => void;
}

export const EmployeeTimeline: React.FC<EmployeeTimelineProps> = ({
  employeeId,
  timeline,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    eventType: 'OUTRO' as TimelineEventType,
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
  });

  const getEventConfig = (type: TimelineEventType) => {
    switch (type) {
      case 'ADMISSAO':
        return {
          icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200',
          title: 'Admissão',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'MUDANCA_CARGO':
        return {
          icon: <Briefcase className="w-4 h-4 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-200',
          title: 'Mudança de Cargo / Promoção',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'MUDANCA_SETOR':
        return {
          icon: <Layers className="w-4 h-4 text-atrio-teal-dark" />,
          bg: 'bg-teal-50 border-teal-200',
          title: 'Transferência de Setor',
          badgeClass: 'bg-teal-100 text-atrio-navy border-teal-200',
        };
      case 'MUDANCA_GESTOR':
        return {
          icon: <Users className="w-4 h-4 text-blue-600" />,
          bg: 'bg-blue-50 border-blue-200',
          title: 'Alteração de Gestor',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'ALTERACAO_SALARIAL':
        return {
          icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200',
          title: 'Reajuste Salarial',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'FERIAS':
        return {
          icon: <Sun className="w-4 h-4 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200',
          title: 'Férias',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'AFASTAMENTO':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
          bg: 'bg-orange-50 border-orange-200',
          title: 'Afastamento',
          badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        };
      case 'DESLIGAMENTO':
        return {
          icon: <UserMinus className="w-4 h-4 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200',
          title: 'Desligamento',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        };
      case 'OUTRO':
      default:
        return {
          icon: <Info className="w-4 h-4 text-slate-600" />,
          bg: 'bg-slate-50 border-slate-200',
          title: 'Evento Geral',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const handleSubmitCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError('A descrição do evento é obrigatória.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await employeeService.createTimelineEvent(employeeId, {
        eventType: form.eventType,
        description: form.description,
        eventDate: form.eventDate,
      });

      setIsModalOpen(false);
      setForm({
        eventType: 'OUTRO',
        description: '',
        eventDate: new Date().toISOString().split('T')[0],
      });
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao registrar evento na timeline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-atrio-border">
        <div>
          <h3 className="text-base font-bold text-atrio-text-primary">
            Timeline Histórica e Rastreabilidade
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro imutável de todas as movimentações de carreira, setor, gestor e marcos na empresa
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="w-4 h-4 text-atrio-teal" />}
          onClick={() => setIsModalOpen(true)}
        >
          Registrar Marco Avulso
        </Button>
      </div>

      {/* Lista da Timeline Vertical */}
      {timeline.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">Nenhum marco registrado na timeline</p>
          <p className="text-xs text-slate-400 mt-1">
            Eventos como admissão, promoções e transferências aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timeline.map((event) => {
            const config = getEventConfig(event.eventType);
            return (
              <div key={event.id} className="relative group">
                {/* Marcador do Ponto na Linha */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${config.bg}`}
                >
                  {config.icon}
                </div>

                {/* Card do Evento */}
                <div className="bg-white rounded-xl border border-atrio-border p-4 shadow-xs hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                      >
                        {config.title}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(event.eventDate)}
                      </span>
                    </div>

                    {event.author && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Registrado por: {event.author.email}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-atrio-text-primary font-medium">
                    {event.description}
                  </p>

                  {/* Comparativo de Dados Anteriores vs Novos (se disponível) */}
                  {(event.previousData || event.newData) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      {/* Caso MUDANCA_CARGO */}
                      {event.eventType === 'MUDANCA_CARGO' && event.previousData && event.newData && (
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="line-through text-slate-400 font-medium">
                            {event.previousData.title}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-atrio-teal shrink-0" />
                          <span className="font-semibold text-atrio-navy">
                            {event.newData.title}
                          </span>
                        </div>
                      )}

                      {/* Caso MUDANCA_SETOR */}
                      {event.eventType === 'MUDANCA_SETOR' && event.previousData && event.newData && (
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="line-through text-slate-400 font-medium">
                            {event.previousData.name}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-atrio-teal shrink-0" />
                          <span className="font-semibold text-atrio-teal-dark">
                            {event.newData.name}
                          </span>
                        </div>
                      )}

                      {/* Caso MUDANCA_GESTOR */}
                      {event.eventType === 'MUDANCA_GESTOR' && event.previousData && event.newData && (
                        <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="line-through text-slate-400 font-medium">
                            Gestor: {event.previousData.name}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-atrio-teal shrink-0" />
                          <span className="font-semibold text-blue-700">
                            Gestor: {event.newData.name}
                          </span>
                        </div>
                      )}

                      {/* Caso ALTERACAO_SALARIAL */}
                      {event.eventType === 'ALTERACAO_SALARIAL' && event.previousData && event.newData && (
                        <div className="flex items-center gap-2 text-slate-600 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                          <span className="line-through text-slate-400 font-medium">
                            R$ {Number(event.previousData.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-700">
                            R$ {Number(event.newData.salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Registro de Marco Avulso */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Novo Marco na Timeline"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCustomEvent} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
              {error}
            </div>
          )}

          <Select
            label="Tipo de Evento"
            value={form.eventType}
            onChange={(e) => setForm({ ...form, eventType: e.target.value as TimelineEventType })}
            options={[
              { value: 'OUTRO', label: 'Marco Geral / Observação' },
              { value: 'MUDANCA_CARGO', label: 'Mudança de Cargo / Promoção' },
              { value: 'MUDANCA_SETOR', label: 'Transferência de Setor' },
              { value: 'MUDANCA_GESTOR', label: 'Alteração de Gestor' },
              { value: 'ALTERACAO_SALARIAL', label: 'Reajuste Salarial' },
              { value: 'FERIAS', label: 'Férias' },
              { value: 'AFASTAMENTO', label: 'Afastamento' },
              { value: 'DESLIGAMENTO', label: 'Desligamento' },
            ]}
            required
          />

          <Input
            label="Data de Vigência do Evento"
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            required
          />

          <Textarea
            label="Descrição Detalhada do Evento"
            rows={3}
            placeholder="Ex: Conclusão do período de experiência com avaliação positiva..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-atrio-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Marco'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
