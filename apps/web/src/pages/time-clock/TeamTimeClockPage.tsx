import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  RefreshCw,
  Printer
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TimeClockSummaryCards } from '../../components/time-clock/TimeClockSummaryCards';
import { TimeClockDailyTable } from '../../components/time-clock/TimeClockDailyTable';
import { api } from '../../services/api';

export const TeamTimeClockPage: React.FC = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);

  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [memberLoading, setMemberLoading] = useState(false);
  const [memberMonthlyData, setMemberMonthlyData] = useState<any>(null);

  const fetchTeamData = async (y: number, m: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/time-clock/team/summary?year=${y}&month=${m}`);
      const list = res.data.data.members || [];
      setTeamMembers(list);

      // Se nenhum selecionado ou o selecionado não está mais na lista, seleciona o primeiro
      if (list.length > 0 && (!selectedMemberId || !list.some((m: any) => m.employee.id === selectedMemberId))) {
        setSelectedMemberId(list[0].employee.id);
      }
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberMonthly = async (empId: string, y: number, m: number) => {
    try {
      setMemberLoading(true);
      const res = await api.get(`/time-clock/employees/${empId}/monthly?year=${y}&month=${m}`);
      setMemberMonthlyData(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar espelho do colaborador:', err);
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (selectedMemberId) {
      fetchMemberMonthly(selectedMemberId, currentYear, currentMonth);
    }
  }, [selectedMemberId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const normalizeText = (text?: string | null) =>
    text
      ? text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      : '';

  const filteredMembers = teamMembers.filter((m) => {
    const term = normalizeText(searchTerm);
    if (!term) return true;

    const name = normalizeText(m.employee.name);
    const reg = normalizeText(m.employee.registrationNumber);
    const dept = normalizeText(m.employee.department?.name);
    const pos = normalizeText(m.employee.position?.title);

    return (
      name.includes(term) ||
      reg.includes(term) ||
      dept.includes(term) ||
      pos.includes(term)
    );
  });

  // Métricas agregadas da equipe
  const totalTeamMembers = teamMembers.length;
  const membersWithDivergences = teamMembers.filter((m) => m.divergencesCount > 0).length;
  const totalPositiveBalances = teamMembers.filter((m) => m.monthBalanceMinutes > 0).length;
  const totalNegativeBalances = teamMembers.filter((m) => m.monthBalanceMinutes < 0).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-atrio-teal" />
              Gestão de Ponto da Equipe
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Acompanhe o espelho de ponto, saldo de banco de horas e divergências dos colaboradores liderados.
            </p>
          </div>

          {/* Navegação de Mês */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={handlePrevMonth}
            />
            <div className="px-4 py-1.5 bg-white border border-atrio-border rounded-lg text-sm font-bold text-atrio-text-primary font-mono min-w-36 text-center shadow-sm">
              {String(currentMonth).padStart(2, '0')}/{currentYear}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={handleNextMonth}
            />
          </div>
        </div>

        {/* Cards de Métricas da Equipe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="sm" className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-atrio-navy flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-atrio-text-secondary font-medium">Liderados na Equipe</span>
              <div className="text-xl font-bold text-atrio-text-primary font-mono">{totalTeamMembers}</div>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-atrio-text-secondary font-medium">Com Divergências</span>
              <div className="text-xl font-bold text-amber-700 font-mono">{membersWithDivergences}</div>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-atrio-text-secondary font-medium">Saldo Positivo (Crédito)</span>
              <div className="text-xl font-bold text-emerald-700 font-mono">{totalPositiveBalances}</div>
            </div>
          </Card>

          <Card padding="sm" className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-atrio-text-secondary font-medium">Saldo Devedor (Débito)</span>
              <div className="text-xl font-bold text-rose-700 font-mono">{totalNegativeBalances}</div>
            </div>
          </Card>
        </div>

        {/* Layout Dividido: Lista de Liderados à Esquerda + Espelho Completo à Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna da Esquerda: Seletor de Colaboradores (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome, matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal shadow-sm"
              />
            </div>

            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {loading ? (
                <Card padding="md" className="text-center text-xs text-slate-400">
                  Carregando membros da equipe...
                </Card>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((m) => {
                  const isSelected = m.employee.id === selectedMemberId;
                  const isPositive = m.monthBalanceMinutes > 0;
                  const isNegative = m.monthBalanceMinutes < 0;

                  return (
                    <div
                      key={m.employee.id}
                      onClick={() => setSelectedMemberId(m.employee.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-atrio-teal shadow-md ring-2 ring-atrio-teal/20'
                          : 'bg-white border-atrio-border hover:border-slate-300 hover:bg-slate-50/50 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-atrio-text-primary truncate">
                            {m.employee.name}
                          </h4>
                          <p className="text-[11px] text-atrio-text-secondary truncate">
                            Matrícula: {m.employee.registrationNumber} • {m.employee.position?.title || 'Colaborador'}
                          </p>
                        </div>
                        {m.divergencesCount > 0 && (
                          <Badge variant="warning" size="sm">
                            {m.divergencesCount} alerta(s)
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                        <span className="text-[11px] text-slate-500 font-sans">Saldo do Mês:</span>
                        <span
                          className={`font-bold ${
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {m.monthBalanceFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Card padding="md" className="text-center text-xs text-slate-400">
                  Nenhum colaborador encontrado.
                </Card>
              )}
            </div>
          </div>

          {/* Coluna da Direita: Espelho do Colaborador Selecionado (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {memberLoading ? (
              <Card padding="lg" className="text-center py-16 text-atrio-text-secondary">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-atrio-teal mb-2" />
                Carregando espelho de ponto...
              </Card>
            ) : memberMonthlyData ? (
              <>
                {/* Header do Colaborador Selecionado */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {memberMonthlyData.employee.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80">
                          Espelho de Ponto Individual
                        </span>
                        {memberMonthlyData.employee.registrationNumber && (
                          <span className="text-xs text-slate-400 font-mono">
                            Matrícula: #{memberMonthlyData.employee.registrationNumber}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                        {memberMonthlyData.employee.name}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">
                        {memberMonthlyData.employee.department} • {memberMonthlyData.employee.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Printer className="w-4 h-4 text-slate-600" />}
                      onClick={() => window.print()}
                      className="rounded-xl border-slate-200 hover:bg-slate-50 font-medium"
                    >
                      Imprimir
                    </Button>
                  </div>
                </div>

                {/* Cards de Resumo */}
                <TimeClockSummaryCards
                  totalExpectedFormatted={memberMonthlyData.summary.totalExpectedFormatted}
                  totalActualFormatted={memberMonthlyData.summary.totalActualFormatted}
                  totalBalanceFormatted={memberMonthlyData.summary.totalBalanceFormatted}
                  totalBalanceMinutes={memberMonthlyData.summary.totalBalanceMinutes}
                  accumulatedClosingFormatted={
                    memberMonthlyData.bankBalance?.accumulatedClosingFormatted || '00h 00m'
                  }
                  accumulatedClosingMinutes={memberMonthlyData.bankBalance?.accumulatedClosingMinutes}
                  divergencesCount={memberMonthlyData.summary.divergencesCount}
                />

                {/* Tabela Diária */}
                <TimeClockDailyTable
                  days={memberMonthlyData.days}
                  showActions={false}
                />
              </>
            ) : (
              <Card padding="lg" className="text-center py-16 text-slate-400">
                Selecione um colaborador ao lado para visualizar seu espelho de ponto.
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
