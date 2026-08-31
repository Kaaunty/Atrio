import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IntegrationConfigItem, integrationService } from '../../services/integrationService';
import {
  Cpu,
  Clock,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const IntegrationsHubPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getIntegrations();
      setIntegrations(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao carregar catálogo de integrações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleToggle = async (key: string, currentEnabled: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setTogglingKey(key);
      const updated = await integrationService.toggleIntegration(key, !currentEnabled);
      setIntegrations((prev) =>
        prev.map((item) => (item.key === key ? { ...item, enabled: updated.enabled, status: updated.status } : item))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao alterar status da integração');
    } finally {
      setTogglingKey(null);
    }
  };

  const getProviderIcon = (key: string) => {
    switch (key) {
      case 'control_id':
        return <Cpu className="w-6 h-6 text-atrio-teal" />;
      case 'dimep':
        return <Clock className="w-6 h-6 text-blue-600" />;
      case 'secullum':
        return <ShieldCheck className="w-6 h-6 text-indigo-600" />;
      default:
        return <Layers className="w-6 h-6 text-slate-600" />;
    }
  };

  const activeCount = integrations.filter((i) => i.enabled).length;

  return (
    <AppLayout
      title="Hub de Integrações"
      subtitle="Gerencie e conecte provedores de relógios de ponto, ERPs e serviços externos"
    >
      <div className="space-y-6">
        {/* Banner de Visão Geral & Boas Práticas */}
        <div className="bg-gradient-to-r from-atrio-navy to-atrio-navy-dark text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-atrio-teal/20 text-atrio-teal border border-atrio-teal/30">
                Arquitetura Multi-Provedores
              </span>
              <span className="text-xs text-slate-300">• Portarias MTE 1510 & MTP 671</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Conectores de Ponto Eletrônico & Dispositivos REP
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O Átrio suporta ativação dinâmica de múltiplos fabricantes. Hoje você pode utilizar coletores{' '}
              <strong>Control iD</strong> com captura por API, push Webhook e AFD, mantendo a flexibilidade de alternar ou
              adicionar novos provedores no futuro sem perder registros históricos.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 bg-white/10 rounded-xl border border-white/10 text-center">
              <span className="text-2xl font-bold text-atrio-teal">{activeCount}</span>
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Ativas</span>
            </div>
            <div className="px-4 py-3 bg-white/10 rounded-xl border border-white/10 text-center">
              <span className="text-2xl font-bold text-white">{integrations.length}</span>
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Disponíveis</span>
            </div>
          </div>
        </div>

        {/* Mensagem de Erro se houver */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={loadIntegrations} className="ml-auto">
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Grid de Cards de Integração */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-atrio-text-primary uppercase tracking-wider">
              Provedores de Ponto & Dispositivos
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadIntegrations}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Atualizar
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => {
                const isControlId = item.key === 'control_id';

                return (
                  <Card
                    key={item.id}
                    className={`relative transition-all duration-200 border cursor-pointer hover:shadow-md ${
                      item.enabled
                        ? 'border-atrio-teal/40 ring-1 ring-atrio-teal/20 bg-white'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                    }`}
                    onClick={() => {
                      if (isControlId) {
                        navigate('/admin/integracoes/control-id');
                      }
                    }}
                  >
                    <div className="p-5 space-y-4">
                      {/* Topo do Card: Ícone + Título + Switch */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
                              item.enabled
                                ? 'bg-atrio-teal-light/40 border-atrio-teal/30 text-atrio-teal'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            {getProviderIcon(item.key)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-atrio-text-primary text-base leading-snug">
                                {item.name}
                              </h4>
                              {isControlId && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-atrio-teal text-white uppercase">
                                  Oficial
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Categoria: Ponto Eletrônico & REP
                            </span>
                          </div>
                        </div>

                        {/* Switch de Ativação Rápida */}
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs font-semibold text-slate-600">
                            {item.enabled ? 'Ativo' : 'Inativo'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggle(item.key, item.enabled, e)}
                            disabled={togglingKey === item.key}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              item.enabled ? 'bg-atrio-teal' : 'bg-slate-300'
                            } ${togglingKey === item.key ? 'opacity-60 cursor-wait' : ''}`}
                            title={item.enabled ? 'Desativar integração' : 'Ativar integração'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                item.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Descrição */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description || 'Conexão direta com relógios de ponto biométricos e virtuais.'}
                      </p>

                      {/* Rodapé do Card: Métricas e Ações */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 font-medium">
                            <Cpu className="w-3.5 h-3.5 text-slate-400" />
                            {item.deviceCount} {item.deviceCount === 1 ? 'relógio' : 'relógios'}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.lastSyncAt
                              ? `Sync: ${new Date(item.lastSyncAt).toLocaleDateString('pt-BR')} ${new Date(
                                  item.lastSyncAt
                                ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              : 'Sem sync recente'}
                          </span>
                        </div>

                        {isControlId ? (
                          <span className="text-atrio-teal font-bold flex items-center gap-1 group-hover:underline">
                            Gerenciar <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Disponível / Extensível</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
