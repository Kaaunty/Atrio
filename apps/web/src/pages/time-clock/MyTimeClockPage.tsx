import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  RefreshCw, 
  FileText
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TimeClockSummaryCards } from '../../components/time-clock/TimeClockSummaryCards';
import { TimeClockDailyTable, DailyRowItem } from '../../components/time-clock/TimeClockDailyTable';
import { RequestAdjustmentModal } from '../../components/time-clock/RequestAdjustmentModal';
import { api } from '../../services/api';

export const MyTimeClockPage: React.FC = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);

  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [todayData, setTodayData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);

  // Modais
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [myAdjustments, setMyAdjustments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedDayForAdjustment, setSelectedDayForAdjustment] = useState<DailyRowItem | null>(null);

  const fetchMonthlyData = async (y: number, m: number) => {
    try {
      setLoading(true);
      const [resMonthly, resToday, resBalance] = await Promise.all([
        api.get(`/time-clock/me/monthly?year=${y}&month=${m}`),
        api.get('/time-clock/me/today').catch(() => ({ data: { data: null } })),
        api.get('/time-clock/me/balance').catch(() => ({ data: { data: null } })),
      ]);

      setData(resMonthly.data.data);
      if (resToday.data.data) setTodayData(resToday.data.data.today);
      if (resBalance.data.data) setBalanceData(resBalance.data.data);
    } catch (err: any) {
      console.error('Erro ao carregar dados de ponto:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAdjustments = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/time-clock/adjustments/me');
      setMyAdjustments(res.data.items || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de solicitações:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

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

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      await api.post('/time-clock/recalculate', {
        yearMonth: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      });
      await fetchMonthlyData(currentYear, currentMonth);
    } catch (err) {
      console.error('Erro ao recalcular:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenAdjustment = (day: DailyRowItem) => {
    setSelectedDayForAdjustment(day);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenHistory = () => {
    fetchMyAdjustments();
    setIsHistoryModalOpen(true);
  };

  const handleCancelAdjustment = async (id: string) => {
    try {
      await api.delete(`/time-clock/adjustments/${id}`);
      await fetchMyAdjustments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cancelar solicitação');
    }
  };

  const isCurrentMonthView =
    currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Pendente Gestor</Badge>;
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Em Análise RH</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
      case 'CANCELADO':
        return <Badge variant="neutral" size="sm">Cancelado</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-atrio-teal" />
              Meu Ponto
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Consulte seu espelho de ponto mensal, marcações diárias e saldo acumulado de banco de horas.
            </p>
          </div>

          {/* Ações Rápidas do Topo */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="w-4 h-4 text-atrio-teal" />}
              onClick={handleOpenHistory}
              className="text-xs"
            >
              Minhas Solicitações
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />}
              onClick={handleRecalculate}
              disabled={recalculating || loading}
              className="text-xs"
            >
              {recalculating ? 'Recalculando...' : 'Recalcular'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              className="text-xs"
            >
              Imprimir
            </Button>
          </div>
        </div>

        {/* Informações do Colaborador (Exibição Amigável para Impressão) */}
        {data?.employee && (
          <div className="hidden print:block mb-4 p-4 border border-slate-300 rounded text-xs">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <div>
                <span className="font-bold text-sm">ÁTRIO RH DIGITAL — ESPELHO DE PONTO ELETRÔNICO</span>
                <p>Empresa: {data.employee.company?.tradeName} | CNPJ: {data.employee.company?.cnpj}</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold">Período: {data.period.monthName}/{data.period.year}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <p><strong>Colaborador:</strong> {data.employee.name}</p>
              <p><strong>Matrícula:</strong> {data.employee.registrationNumber}</p>
              <p><strong>CPF:</strong> {data.employee.cpf}</p>
              <p><strong>Setor:</strong> {data.employee.department}</p>
              <p><strong>Cargo:</strong> {data.employee.position}</p>
              <p><strong>Escala:</strong> {data.employee.scheduleName}</p>
            </div>
          </div>
        )}

        {/* Barra de Navegação de Mês/Ano */}
        <div className="bg-white border border-atrio-border rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-sm print:hidden">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={handlePrevMonth}
            />
            <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-atrio-text-primary font-mono flex-1 sm:flex-initial sm:min-w-44 text-center truncate">
              {data?.period?.monthName ? `${data.period.monthName.toUpperCase()} DE ${currentYear}` : `${currentMonth}/${currentYear}`}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight className="w-4 h-4" />}
              onClick={handleNextMonth}
            />
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 text-xs text-atrio-text-secondary">
            <span>
              Escala:{' '}
              <strong className="text-atrio-text-primary">{data?.employee?.scheduleName || 'Padrão 44h'}</strong>
            </span>
          </div>
        </div>

        {/* Card do Dia Atual (Tempo Real) - se visualizando o mês corrente */}
        {isCurrentMonthView && todayData && (
          <Card padding="sm" className="bg-gradient-to-r from-[#04162e] to-[#082E5C] text-white border-0 shadow-md print:hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-atrio-teal text-atrio-navy-dark text-[11px] font-bold tracking-wider uppercase">
                    Hoje ({todayData.dayOfWeekName})
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Data: {todayData.date.split('-').reverse().join('/')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Status Atual:{' '}
                  <span className="text-atrio-teal">
                    {todayData.currentShiftStatus === 'TRABALHANDO'
                      ? '🟢 Em Jornada (Trabalhando)'
                      : todayData.currentShiftStatus === 'INTERVALO_ALMOCO'
                      ? '🟡 Intervalo de Almoço'
                      : todayData.currentShiftStatus === 'JORNADA_ENCERRADA'
                      ? '✅ Jornada Concluída'
                      : todayData.currentShiftStatus === 'FOLGA'
                      ? '☕ Dia de Folga'
                      : '⚪ Marcações Pendentes'}
                  </span>
                </h3>
              </div>

              {/* Batidas registradas hoje */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-300 mr-1">Marcações de Hoje:</span>
                {todayData.entries.length > 0 ? (
                  todayData.entries.map((ent: any, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 font-mono text-sm font-bold text-white shadow-inner"
                    >
                      {ent.time}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Nenhuma batida registrada hoje até o momento</span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Cards de Resumo Mensal */}
        {data?.summary && (
          <TimeClockSummaryCards
            totalExpectedFormatted={data.summary.totalExpectedFormatted}
            totalActualFormatted={data.summary.totalActualFormatted}
            totalBalanceFormatted={data.summary.totalBalanceFormatted}
            totalBalanceMinutes={data.summary.totalBalanceMinutes}
            accumulatedClosingFormatted={data.bankBalance?.accumulatedClosingFormatted || '00h 00m'}
            accumulatedClosingMinutes={data.bankBalance?.accumulatedClosingMinutes}
            divergencesCount={data.summary.divergencesCount}
            onOpenBalanceExtract={() => setIsBalanceModalOpen(true)}
          />
        )}

        {/* Tabela Diária Detalhada */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-atrio-text-primary tracking-tight">
              Apuração Diária do Mês ({data?.days?.length || 0} dias)
            </h2>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-[11px] sm:text-xs text-atrio-text-secondary print:hidden">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shrink-0" /> Regular
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500 shrink-0" /> Divergência
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-400 shrink-0" /> Folga / FDS
              </span>
            </div>
          </div>

          {loading ? (
            <Card padding="lg" className="text-center text-atrio-text-secondary py-12">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-atrio-teal mb-2" />
              Carregando espelho de ponto...
            </Card>
          ) : data?.days ? (
            <TimeClockDailyTable
              days={data.days}
              todayDateStr={todayStr}
              onRequestAdjustment={handleOpenAdjustment}
            />
          ) : (
            <Card padding="lg" className="text-center py-10 space-y-2">
              <p className="font-semibold text-slate-700 text-sm">Nenhum dado encontrado para o período selecionado.</p>
              <p className="text-xs text-slate-400">Utilize as setas de navegação acima para consultar outros meses.</p>
            </Card>
          )}
        </div>

        {/* Rodapé de Assinatura para Impressão */}
        <div className="hidden print:block mt-12 pt-8 border-t border-slate-400 text-xs">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div>
              <div className="border-t border-slate-700 pt-1 font-semibold">{data?.employee?.name}</div>
              <p className="text-[10px] text-slate-500">Assinatura do Colaborador</p>
            </div>
            <div>
              <div className="border-t border-slate-700 pt-1 font-semibold">Responsável / Recursos Humanos</div>
              <p className="text-[10px] text-slate-500">Assinatura da Empresa</p>
            </div>
          </div>
        </div>

        {/* Modal de Extrato do Banco de Horas */}
        <Modal
          isOpen={isBalanceModalOpen}
          onClose={() => setIsBalanceModalOpen(false)}
          title="Extrato do Banco de Horas Acumulado"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-atrio-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-atrio-text-secondary uppercase font-bold tracking-wider">
                  Saldo Geral Acumulado
                </span>
                <div className="text-2xl font-bold font-mono text-atrio-text-primary mt-0.5">
                  {balanceData?.accumulatedBalanceFormatted || '00h 00m'}
                </div>
              </div>
              <Badge
                variant={
                  (balanceData?.accumulatedBalanceMinutes || 0) >= 0 ? 'success' : 'danger'
                }
                size="md"
              >
                {(balanceData?.accumulatedBalanceMinutes || 0) >= 0 ? 'Saldo Positivo' : 'Saldo Devedor'}
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-atrio-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-atrio-border text-[10px] font-bold text-atrio-text-secondary uppercase">
                    <th className="py-2.5 px-3">Mês/Ano</th>
                    <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                    <th className="py-2.5 px-3 text-right">Créditos</th>
                    <th className="py-2.5 px-3 text-right">Débitos</th>
                    <th className="py-2.5 px-3 text-right">Ajustes</th>
                    <th className="py-2.5 px-3 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {balanceData?.statement?.map((item: any) => (
                    <tr key={item.yearMonth} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-atrio-text-primary">{item.yearMonth}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{item.startingBalanceFormatted}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                        {item.totalCreditsFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{item.totalDebitsFormatted}</td>
                      <td className="py-2.5 px-3 text-right text-indigo-600">
                        {item.manualAdjustmentsFormatted !== '00h 00m' ? item.manualAdjustmentsFormatted : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {item.closingBalanceFormatted}
                      </td>
                    </tr>
                  ))}
                  {(!balanceData?.statement || balanceData.statement.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-slate-400">
                        Nenhum histórico consolidado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsBalanceModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Histórico de Solicitações do Colaborador */}
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title="Minhas Solicitações de Ajuste de Ponto"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {historyLoading ? (
              <div className="text-center py-8 text-slate-400">Carregando solicitações...</div>
            ) : myAdjustments.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {myAdjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-atrio-text-primary">
                        <span>Data: {adj.date.split('T')[0].split('-').reverse().join('/')}</span>
                        <Badge variant="teal" size="sm">
                          {adj.adjustmentType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(adj.status)}
                        {adj.status === 'PENDENTE_GESTOR' && (
                          <button
                            type="button"
                            onClick={() => handleCancelAdjustment(adj.id)}
                            className="text-rose-500 hover:text-rose-700 underline text-[11px]"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="text-slate-400">Horário Ajustado:</span>{' '}
                        <strong className="text-atrio-navy font-mono">{adj.targetTime}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Motivo:</span> {adj.reason}
                      </div>
                    </div>

                    {adj.notes && (
                      <p className="text-slate-500 bg-white p-2 rounded border border-slate-100">
                        <strong>Minha Justificativa:</strong> {adj.notes}
                      </p>
                    )}

                    {adj.managerNotes && (
                      <p className="text-blue-800 bg-blue-50 p-2 rounded border border-blue-100">
                        <strong>Parecer do Gestor ({adj.manager?.name}):</strong> {adj.managerNotes}
                      </p>
                    )}

                    {adj.rhNotes && (
                      <p className="text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                        <strong>Parecer do RH:</strong> {adj.rhNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Você ainda não realizou nenhuma solicitação de ajuste de ponto.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsHistoryModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal de Solicitação de Ajuste de Ponto Conectado */}
        <RequestAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          onSuccess={() => fetchMonthlyData(currentYear, currentMonth)}
          selectedDay={selectedDayForAdjustment}
        />
      </div>
    </AppLayout>
  );
};
