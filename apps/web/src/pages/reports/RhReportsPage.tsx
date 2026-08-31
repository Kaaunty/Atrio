import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  FileCheck2,
  Users,
  Clock,
  AlertTriangle,
  Calendar,
  Stethoscope,
  FileText,
  Download,
  Filter,
  Loader2,
  Printer,
} from 'lucide-react';
import { api } from '../../services/api';

export const RhReportsPage: React.FC = () => {
  const [format, setFormat] = useState<'XLSX' | 'CSV' | 'PDF'>('XLSX');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Espelho em PDF Individual
  const [mirrorEmployeeId, setMirrorEmployeeId] = useState<string>('');
  const [mirrorYearMonth, setMirrorYearMonth] = useState<string>('2026-08');
  const [employees, setEmployees] = useState<{ id: string; name: string; registrationNumber: string }[]>([]);

  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptsRes, empsRes] = await Promise.all([
          api.get('/departments'),
          api.get('/employees', { params: { pageSize: 100 } }),
        ]);
        setDepartments(deptsRes.data.data || []);
        setEmployees(empsRes.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar dados para os filtros:', err);
      }
    };
    fetchData();
  }, []);

  const handleExport = async (endpoint: string, reportKey: string, defaultName: string) => {
    try {
      setDownloadingReport(reportKey);
      const payload = {
        format,
        departmentId: selectedDept || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const response = await api.post(`/reports/${endpoint}`, payload, {
        responseType: 'blob',
      });

      const ext = format.toLowerCase();
      const filename = `${defaultName}_${Date.now()}.${ext}`;

      const blob = new Blob([response.data], {
        type: String(response.headers['content-type'] || 'application/octet-stream'),
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
    } finally {
      setDownloadingReport(null);
    }
  };

  const handleExportMonthlyMirrorPdf = async () => {
    if (!mirrorEmployeeId) {
      alert('Selecione um colaborador para gerar o Espelho de Ponto em PDF.');
      return;
    }

    try {
      setDownloadingReport('mirror-pdf');
      const response = await api.post(
        '/reports/time-clock/monthly-mirror-pdf',
        {
          employeeId: mirrorEmployeeId,
          yearMonth: mirrorYearMonth,
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `espelho_ponto_${mirrorYearMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF do Espelho de Ponto:', err);
    } finally {
      setDownloadingReport(null);
    }
  };

  const reportsList = [
    {
      key: 'employees',
      title: 'Relatório Cadastral de Colaboradores',
      desc: 'Lista completa de colaboradores ativos, cargos, setores, vínculos de gestão e contratos.',
      icon: Users,
      color: 'bg-blue-50 text-atrio-navy',
      endpoint: 'employees/export',
      name: 'relatorio_colaboradores',
    },
    {
      key: 'time-clock',
      title: 'Espelho de Ponto & Banco de Horas',
      desc: 'Resumo mensal de batidas, horas trabalhadas, saldo acumulado, horas extras e faltas.',
      icon: Clock,
      color: 'bg-atrio-teal-light text-atrio-teal-dark',
      endpoint: 'time-clock/export',
      name: 'espelho_ponto_banco_horas',
    },
    {
      key: 'divergences',
      title: 'Relatório de Divergências de Ponto',
      desc: 'Mapeamento de batidas inconsistentes, marcações ímpares e pendências de justificativa.',
      icon: AlertTriangle,
      color: 'bg-semantic-warning-light text-semantic-warning',
      endpoint: 'divergences/export',
      name: 'divergencias_ponto',
    },
    {
      key: 'vacations',
      title: 'Relatório de Férias e Vencimentos',
      desc: 'Acompanhamento de períodos aquisitivos, saldos de dias e limite concessivo com alerta de vencimento.',
      icon: Calendar,
      color: 'bg-semantic-info-light text-semantic-info',
      endpoint: 'vacations/export',
      name: 'relatorio_ferias',
    },
    {
      key: 'absenteeism',
      title: 'Relatório de Absenteísmo & Atestados',
      desc: 'Mapeamento de faltas justificadas/não justificadas e atestados médicos cadastrados no período.',
      icon: Stethoscope,
      color: 'bg-semantic-purple-light text-semantic-purple',
      endpoint: 'absenteeism/export',
      name: 'relatorio_absenteismo',
    },
    {
      key: 'requests',
      title: 'Relatório de Solicitações & SLA',
      desc: 'Volume de chamados corporativos abertos, tempo de atendimento (SLA) e taxa de aprovação.',
      icon: FileText,
      color: 'bg-semantic-success-light text-semantic-success',
      endpoint: 'requests/export',
      name: 'relatorio_solicitacoes_sla',
    },
  ];

  return (
    <AppLayout
      title="Central de Relatórios Corporativos"
      subtitle="Gere relatórios gerenciais nos formatos Excel, CSV e PDF com filtros customizados"
    >
      <div className="space-y-6">
        {/* Painel Geral de Filtros */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-atrio-border pb-3">
            <div className="flex items-center gap-2 text-atrio-navy font-bold text-sm">
              <Filter className="w-4 h-4 text-atrio-teal-dark" />
              <span>Filtros Globais de Exportação</span>
            </div>

            {/* Formato Selecionado */}
            <div className="flex items-center gap-1 bg-atrio-border-light p-1 rounded-lg border border-atrio-border">
              {(['XLSX', 'CSV', 'PDF'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    format === fmt
                      ? 'bg-atrio-navy text-white shadow-xs'
                      : 'text-atrio-text-secondary hover:text-atrio-navy'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Departamento / Setor
              </label>
              <Select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                options={[
                  { value: '', label: 'Todos os Departamentos' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Seção 1: Relatórios em Grade (Exportação XLSX / CSV / PDF) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportsList.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingReport === report.key;

            return (
              <Card key={report.key} className="flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${report.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-atrio-border-light text-atrio-navy px-2 py-0.5 rounded border border-atrio-border">
                      {format}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-atrio-navy">{report.title}</h3>
                    <p className="text-xs text-atrio-text-secondary mt-1 leading-relaxed">
                      {report.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-atrio-border/60">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    disabled={isDownloading}
                    onClick={() => handleExport(report.endpoint, report.key, report.name)}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando arquivo...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" /> Download ({format})
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Seção 2: Gerador de Espelho de Ponto em PDF (Assinatura Oficial) */}
        <Card className="space-y-4 border-l-4 border-l-atrio-teal">
          <div className="flex items-center justify-between border-b border-atrio-border pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-atrio-teal-light text-atrio-teal-dark">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-atrio-navy">Espelho de Ponto Mensal em PDF para Assinatura</h3>
                <p className="text-xs text-atrio-text-secondary">
                  Gere o espelho oficial com cabeçalho da empresa, tabela detalhada de batidas e termo para assinatura física ou digital.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Selecione o Colaborador
              </label>
              <Select
                value={mirrorEmployeeId}
                onChange={(e) => setMirrorEmployeeId(e.target.value)}
                options={[
                  { value: '', label: 'Selecione um Colaborador...' },
                  ...employees.map((e) => ({
                    value: e.id,
                    label: `${e.name} (${e.registrationNumber})`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                Mês de Referência (YYYY-MM)
              </label>
              <Input
                placeholder="2026-08"
                value={mirrorYearMonth}
                onChange={(e) => setMirrorYearMonth(e.target.value)}
              />
            </div>

            <div>
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={downloadingReport === 'mirror-pdf'}
                onClick={handleExportMonthlyMirrorPdf}
              >
                {downloadingReport === 'mirror-pdf' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando PDF...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 mr-2" /> Gerar Espelho em PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};
