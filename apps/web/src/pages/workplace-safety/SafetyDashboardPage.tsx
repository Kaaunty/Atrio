import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  HardHat,
  AlertTriangle,
  ClipboardCheck,
  Users,
  Megaphone,
  FileText,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

function isExpiringSoon(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export const SafetyDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePpeCount, setActivePpeCount] = useState(0);
  const [ppeLowStock, setPpeLowStock] = useState(0);
  const [openAccidents, setOpenAccidents] = useState(0);
  const [openInspections, setOpenInspections] = useState(0);
  const [activeCipaMembers, setActiveCipaMembers] = useState(0);
  const [recentActivities, setRecentActivities] = useState(0);
  const [expiringDocuments, setExpiringDocuments] = useState(0);

  const [legalTrainings, setLegalTrainings] = useState<any[] | null>(null);
  const [trainingsUnavailable, setTrainingsUnavailable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ppesRes, accidentsRes, inspectionsRes, cipaRes, activitiesRes, docsRes] = await Promise.all([
        api.get('/workplace-safety/ppes'),
        api.get('/workplace-safety/accidents'),
        api.get('/workplace-safety/inspections'),
        api.get('/workplace-safety/cipa/members', { params: { active: true } }),
        api.get('/workplace-safety/activities'),
        api.get('/workplace-safety/documents/expiring', { params: { days: 30 } }),
      ]);

      const ppes = ppesRes.data.data || [];
      const activePpes = ppes.filter((p: any) => p.active);
      setActivePpeCount(activePpes.length);
      setPpeLowStock(activePpes.filter((p: any) => p.stockQuantity <= 5).length);

      const accidents = accidentsRes.data.data || [];
      setOpenAccidents(accidents.filter((a: any) => a.status !== 'CONCLUIDO').length);

      const inspections = inspectionsRes.data.data || [];
      setOpenInspections(inspections.filter((i: any) => i.status !== 'CONCLUIDO').length);

      const cipaMembers = cipaRes.data.data || [];
      setActiveCipaMembers(cipaMembers.filter((m: any) => m.active).length);

      const activities = activitiesRes.data.data || [];
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setRecentActivities(activities.filter((a: any) => new Date(a.activityDate).getTime() >= thirtyDaysAgo).length);

      const expiring = docsRes.data.data || [];
      setExpiringDocuments(expiring.filter((d: any) => isExpiringSoon(d.expiryDate)).length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar painel de segurança do trabalho');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrainings = useCallback(async () => {
    try {
      const res = await api.get('/rh/trainings', { params: { category: 'OBRIGATORIO_LEGAL' } });
      setLegalTrainings(res.data.data || []);
      setTrainingsUnavailable(false);
    } catch {
      // GET /rh/trainings is gated to ADMIN/RH — users with only seguranca-trabalho
      // permissions will 403 here; degrade gracefully instead of showing an error.
      setLegalTrainings(null);
      setTrainingsUnavailable(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTrainings();
  }, [fetchData, fetchTrainings]);

  const cards = [
    {
      title: 'EPIs',
      subtitle: ppeLowStock > 0 ? `${ppeLowStock} com estoque baixo` : 'Estoque saudável',
      icon: HardHat,
      color: 'text-atrio-teal bg-atrio-teal/10',
      value: activePpeCount,
      valueVariant: ppeLowStock > 0 ? 'danger' : 'success',
      to: '/seguranca-trabalho/epis',
    },
    {
      title: 'Acidentes e Incidentes',
      subtitle: 'Ocorrências em aberto',
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-100',
      value: openAccidents,
      valueVariant: openAccidents > 0 ? 'danger' : 'success',
      to: '/seguranca-trabalho/acidentes',
    },
    {
      title: 'Inspeções',
      subtitle: 'Inspeções em aberto',
      icon: ClipboardCheck,
      color: 'text-atrio-teal bg-atrio-teal/10',
      value: openInspections,
      valueVariant: openInspections > 0 ? 'warning' : 'success',
      to: '/seguranca-trabalho/inspecoes',
    },
    {
      title: 'CIPA',
      subtitle: 'Membros ativos',
      icon: Users,
      color: 'text-atrio-navy bg-atrio-navy/10',
      value: activeCipaMembers,
      valueVariant: 'info',
      to: '/seguranca-trabalho/cipa',
    },
    {
      title: 'SIPATMA/DDS',
      subtitle: 'Atividades nos últimos 30 dias',
      icon: Megaphone,
      color: 'text-atrio-teal bg-atrio-teal/10',
      value: recentActivities,
      valueVariant: 'info',
      to: '/seguranca-trabalho/atividades',
    },
    {
      title: 'Documentos de SST',
      subtitle: 'Vencendo em 30 dias',
      icon: FileText,
      color: 'text-amber-600 bg-amber-100',
      value: expiringDocuments,
      valueVariant: expiringDocuments > 0 ? 'warning' : 'success',
      to: '/seguranca-trabalho/documentos',
    },
  ] as const;

  return (
    <AppLayout title="Segurança do Trabalho" subtitle="Painel geral de saúde e segurança ocupacional">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-atrio-teal/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-atrio-teal" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-atrio-navy">Painel de Segurança do Trabalho</h1>
            <p className="text-xs text-slate-500">Visão geral de EPIs, acidentes, inspeções, CIPA e conformidade</p>
          </div>
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Carregando painel...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link key={card.title} to={card.to}>
                <Card padding="md" hoverable className="h-full">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-bold text-atrio-navy">{card.title}</p>
                    <p className="text-xs text-slate-500">{card.subtitle}</p>
                  </div>
                  <div className="mt-3">
                    <Badge variant={card.valueVariant as any} size="md" dot>
                      {card.value}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4.5 h-4.5 text-atrio-teal" />
            <h2 className="text-sm font-bold text-atrio-navy">Treinamentos Obrigatórios (Legal)</h2>
          </div>
          {trainingsUnavailable ? (
            <p className="text-xs text-slate-500">
              Você não tem permissão para visualizar o compliance de treinamentos legais. Esta informação é restrita a
              usuários ADMIN/RH.
            </p>
          ) : legalTrainings === null ? (
            <p className="text-xs text-slate-400">Carregando treinamentos...</p>
          ) : legalTrainings.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum treinamento obrigatório legal cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {legalTrainings.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-atrio-border last:border-0">
                  <span className="text-slate-700">{t.title || t.name}</span>
                  <Badge variant="info" size="sm">
                    {t.category}
                  </Badge>
                </div>
              ))}
              {legalTrainings.length > 5 && (
                <p className="text-[11px] text-slate-400 pt-1">
                  Exibindo 5 de {legalTrainings.length} treinamentos. Consulte a página de Treinamentos para mais detalhes.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default SafetyDashboardPage;
