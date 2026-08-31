import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  BarChart2,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { api } from '../../services/api';

export interface DocumentTypeItem {
  id: string;
  name: string;
  code: string;
  isInstitutional: boolean;
  requiresReadAcknowledgement: boolean;
}

export interface EmployeeSimple {
  id: string;
  name: string;
  registrationNumber: string;
}

export const RhDocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'BATCH' | 'REPORTS'>('SINGLE');
  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSimple[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Tab 1: Upload Single / Publicação Institucional
  const [singleType, setSingleType] = useState<string>('');
  const [singleEmployeeId, setSingleEmployeeId] = useState<string>('');
  const [singleTitle, setSingleTitle] = useState<string>('');
  const [singleDescription, setSingleDescription] = useState<string>('');
  const [singleFileUrl, setSingleFileUrl] = useState<string>('');
  const [singleFileName, setSingleFileName] = useState<string>('');
  const [singleMonth, setSingleMonth] = useState<string>('8');
  const [singleYear, setSingleYear] = useState<string>('2026');
  const [singleVisibility, setSingleVisibility] = useState<string>('PRIVATE_EMPLOYEE_RH');
  const [singleRequiresAck, setSingleRequiresAck] = useState<boolean>(false);

  // Tab 2: Upload em Lote
  const [batchTypeCode, setBatchTypeCode] = useState<string>('HOLERITE');
  const [batchMonth, setBatchMonth] = useState<number>(8);
  const [batchYear, setBatchYear] = useState<number>(2026);
  const [batchRawInput, setBatchRawInput] = useState<string>(
    'MAT-001, Holerite Agosto 2026, https://storage.atrio.com/batch/holerite_MAT-001.pdf, holerite_MAT-001.pdf\nMAT-002, Holerite Agosto 2026, https://storage.atrio.com/batch/holerite_MAT-002.pdf, holerite_MAT-002.pdf'
  );
  const [batchResult, setBatchResult] = useState<any | null>(null);

  // Tab 3: Relatório de Leitura
  const [reportDocId, setReportDocId] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [typesRes, empRes] = await Promise.all([
          api.get('/documents/types'),
          api.get('/employees?limit=100'),
        ]);

        const fetchedTypes = typesRes.data.data || [];
        setDocTypes(fetchedTypes);
        if (fetchedTypes.length > 0) setSingleType(fetchedTypes[0].id);

        const fetchedEmps = empRes.data.data?.employees || empRes.data.data || [];
        setEmployees(
          fetchedEmps.map((e: any) => ({
            id: e.id,
            name: e.name,
            registrationNumber: e.registrationNumber,
          }))
        );
      } catch (err: any) {
        console.error('Erro ao carregar dados iniciais:', err);
      }
    };

    fetchData();
  }, []);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTitle || !singleFileUrl || !singleFileName) {
      setError('Preencha os campos obrigatórios (Título, URL e Nome do arquivo).');
      return;
    }

    try {
      setSubmitLoading(true);
      setError(null);

      if (singleVisibility === 'PRIVATE_EMPLOYEE_RH') {
        if (!singleEmployeeId) {
          setError('Selecione o colaborador para envio de documento privado.');
          setSubmitLoading(false);
          return;
        }

        await api.post('/documents/upload-single', {
          documentTypeId: singleType,
          employeeId: singleEmployeeId,
          title: singleTitle,
          description: singleDescription || null,
          fileUrl: singleFileUrl,
          fileName: singleFileName,
          fileSize: 150000,
          mimeType: 'application/pdf',
          referenceMonth: singleMonth ? Number(singleMonth) : null,
          referenceYear: singleYear ? Number(singleYear) : null,
        });

        setSuccessMsg(`Documento '${singleTitle}' enviado com sucesso para o colaborador.`);
      } else {
        await api.post('/documents/publish-institutional', {
          documentTypeId: singleType,
          title: singleTitle,
          description: singleDescription || null,
          fileUrl: singleFileUrl,
          fileName: singleFileName,
          fileSize: 350000,
          mimeType: 'application/pdf',
          visibility: singleVisibility,
          requiresReadAcknowledgement: singleRequiresAck,
        });

        setSuccessMsg(`Documento institucional '${singleTitle}' publicado com sucesso.`);
      }

      setSingleTitle('');
      setSingleDescription('');
      setSingleFileUrl('');
      setSingleFileName('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar documento');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    try {
      setSubmitLoading(true);
      setError(null);
      setBatchResult(null);

      // Converte a caixa de texto em itens
      const lines = batchRawInput.split('\n').filter((l) => l.trim().length > 0);
      const items = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          registrationOrCpf: parts[0] || '',
          title: parts[1] || `Holerite ${batchMonth}/${batchYear}`,
          fileUrl: parts[2] || 'https://storage.atrio.com/batch/arquivo.pdf',
          fileName: parts[3] || `${parts[0] || 'doc'}.pdf`,
          fileSize: 120000,
          mimeType: 'application/pdf',
        };
      });

      const res = await api.post('/documents/upload-batch', {
        documentTypeCode: batchTypeCode,
        referenceMonth: batchMonth,
        referenceYear: batchYear,
        items,
      });

      setBatchResult(res.data.data);
      setSuccessMsg(`Upload em lote processado: ${res.data.data.matched} arquivo(s) vinculados.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro no processamento em lote');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFetchReport = async (docId: string) => {
    setReportDocId(docId);
    if (!docId) return;

    try {
      setReportLoading(true);
      const res = await api.get(`/documents/${docId}/receipts-report`);
      setReportData(res.data.data);
    } catch (err: any) {
      console.error('Erro ao buscar relatório:', err);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <AppLayout title="Gestão Central de Documentos (RH)">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-atrio-border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-atrio-navy">Painel de Gestão de Documentos &amp; Políticas</h1>
              <Badge variant="teal" size="sm">Módulo RH</Badge>
            </div>
            <p className="text-xs text-atrio-text-secondary mt-1">
              Disponibilize holerites individuais, envie arquivos em lote por matrícula e publique políticas corporativas.
            </p>
          </div>
        </div>

        {/* Mensagens Globais */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-semantic-success-light text-semantic-success border border-semantic-success/20 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-semantic-error-light text-semantic-error border border-semantic-error/20 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Navegação por Abas */}
        <div className="flex border-b border-atrio-border bg-white rounded-t-xl px-4 pt-3 gap-2">
          {[
            { id: 'SINGLE', label: 'Publicar / Upload Individual', icon: Plus },
            { id: 'BATCH', label: 'Upload em Lote (Holerites)', icon: Upload },
            { id: 'REPORTS', label: 'Relatórios de Aceite & Leitura', icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                  isActive
                    ? 'border-atrio-teal text-atrio-teal-dark bg-atrio-teal-light/20 rounded-t-lg'
                    : 'border-transparent text-atrio-text-secondary hover:text-atrio-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo Aba 1: Upload Individual & Publicação */}
        {activeTab === 'SINGLE' && (
          <Card className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-atrio-navy">Enviar Novo Documento ou Política</h3>
              <p className="text-xs text-atrio-text-secondary">
                Selecione se o arquivo destina-se a um colaborador específico ou a toda a empresa.
              </p>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Tipo de Documento *"
                  value={singleType}
                  onChange={(e) => setSingleType(e.target.value)}
                  options={docTypes.map((t) => ({ value: t.id, label: t.name }))}
                />

                <Select
                  label="Visibilidade do Documento *"
                  value={singleVisibility}
                  onChange={(e) => setSingleVisibility(e.target.value)}
                  options={[
                    { value: 'PRIVATE_EMPLOYEE_RH', label: 'Privado (Apenas Colaborador & RH)' },
                    { value: 'COMPANY_WIDE', label: 'Institucional (Toda a Empresa)' },
                    { value: 'DEPARTMENT', label: 'Por Departamento' },
                  ]}
                />
              </div>

              {singleVisibility === 'PRIVATE_EMPLOYEE_RH' && (
                <Select
                  label="Colaborador Destinatário *"
                  value={singleEmployeeId}
                  onChange={(e) => setSingleEmployeeId(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione o colaborador...' },
                    ...employees.map((emp) => ({
                      value: emp.id,
                      label: `${emp.name} (Matrícula: ${emp.registrationNumber})`,
                    })),
                  ]}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Título do Documento *"
                  placeholder="Ex: Holerite - Agosto/2026 ou Política de Segurança"
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                />
                <Input
                  label="Nome do Arquivo (fileName) *"
                  placeholder="Ex: holerite_aug2026.pdf"
                  value={singleFileName}
                  onChange={(e) => setSingleFileName(e.target.value)}
                />
              </div>

              <Input
                label="URL Segura do Arquivo (fileUrl) *"
                placeholder="Ex: https://storage.atrio.com/docs/arquivo.pdf"
                value={singleFileUrl}
                onChange={(e) => setSingleFileUrl(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Mês de Referência (Opcional)"
                  value={singleMonth}
                  onChange={(e) => setSingleMonth(e.target.value)}
                  options={[
                    { value: '1', label: 'Janeiro' },
                    { value: '2', label: 'Fevereiro' },
                    { value: '3', label: 'Março' },
                    { value: '4', label: 'Abril' },
                    { value: '5', label: 'Maio' },
                    { value: '6', label: 'Junho' },
                    { value: '7', label: 'Julho' },
                    { value: '8', label: 'Agosto' },
                    { value: '9', label: 'Setembro' },
                    { value: '10', label: 'Outubro' },
                    { value: '11', label: 'Novembro' },
                    { value: '12', label: 'Dezembro' },
                  ]}
                />
                <Select
                  label="Ano de Referência (Opcional)"
                  value={singleYear}
                  onChange={(e) => setSingleYear(e.target.value)}
                  options={[
                    { value: '2026', label: '2026' },
                    { value: '2025', label: '2025' },
                  ]}
                />
              </div>

              {singleVisibility !== 'PRIVATE_EMPLOYEE_RH' && (
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={singleRequiresAck}
                    onChange={(e) => setSingleRequiresAck(e.target.checked)}
                    className="rounded border-atrio-border text-atrio-teal focus:ring-atrio-teal"
                  />
                  <span className="text-xs font-semibold text-atrio-navy">
                    Exigir confirmação de leitura / aceite dos colaboradores
                  </span>
                </label>
              )}

              <div className="pt-4 flex justify-end">
                <Button variant="primary" size="sm" disabled={submitLoading} type="submit">
                  {submitLoading ? 'Publicando...' : 'Publicar Documento'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Conteúdo Aba 2: Upload em Lote */}
        {activeTab === 'BATCH' && (
          <Card className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-atrio-navy">Importação em Lote de Holerites &amp; Informes</h3>
              <p className="text-xs text-atrio-text-secondary">
                Associação automática de múltiplos documentos aos colaboradores através de Matrícula ou CPF.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Tipo de Documento"
                value={batchTypeCode}
                onChange={(e) => setBatchTypeCode(e.target.value)}
                options={[
                  { value: 'HOLERITE', label: 'Holerite / Contracheque' },
                  { value: 'INFORME_IR', label: 'Informe de Rendimentos (IR)' },
                ]}
              />
              <Select
                label="Mês de Referência"
                value={String(batchMonth)}
                onChange={(e) => setBatchMonth(Number(e.target.value))}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} - ${new Date(2026, i, 1).toLocaleString('pt-BR', { month: 'long' })}`,
                }))}
              />
              <Select
                label="Ano de Referência"
                value={String(batchYear)}
                onChange={(e) => setBatchYear(Number(e.target.value))}
                options={[{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }]}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-atrio-navy block">
                Lista de Arquivos (Formato: Matrícula/CPF, Título, URL, NomeArquivo)
              </label>
              <textarea
                rows={6}
                value={batchRawInput}
                onChange={(e) => setBatchRawInput(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-lg border border-atrio-border bg-atrio-border-light/30 focus:ring-2 focus:ring-atrio-teal focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-atrio-border">
              <span className="text-xs text-atrio-text-secondary">
                {batchRawInput.split('\n').filter((l) => l.trim().length > 0).length} arquivo(s) prontos para processar.
              </span>
              <Button variant="primary" size="sm" disabled={submitLoading} onClick={handleBatchSubmit}>
                {submitLoading ? 'Processando Lote...' : 'Processar e Enviar Lote'}
              </Button>
            </div>

            {batchResult && (
              <div className="p-4 rounded-xl bg-atrio-teal-light/40 border border-atrio-teal/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-atrio-navy">
                  <span>Resultado do Processamento:</span>
                  <Badge variant="success" size="sm">
                    {batchResult.matched} / {batchResult.total} Mapeados
                  </Badge>
                </div>
                {batchResult.errors.length > 0 && (
                  <div className="space-y-1 text-xs text-semantic-error">
                    <span className="font-bold">Inconsistências encontradas ({batchResult.unmatched}):</span>
                    {batchResult.errors.map((err: any, idx: number) => (
                      <p key={idx} className="font-mono text-[11px]">• {err.fileName}: {err.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Conteúdo Aba 3: Relatório de Leitura */}
        {activeTab === 'REPORTS' && (
          <Card className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-atrio-navy">Relatório de Conformidade &amp; Aceite de Políticas</h3>
              <p className="text-xs text-atrio-text-secondary">
                Consulte o engajamento e a lista de colaboradores que já confirmaram leitura das políticas da empresa.
              </p>
            </div>

            <div className="max-w-md">
              <Select
                label="Selecione o Documento Institucional"
                value={reportDocId}
                onChange={(e) => handleFetchReport(e.target.value)}
                options={[
                  { value: '', label: 'Escolha uma política...' },
                  ...docTypes
                    .filter((t) => t.isInstitutional || t.requiresReadAcknowledgement)
                    .map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            </div>

            {reportLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs text-atrio-text-secondary">Gerando relatório de engajamento...</p>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Gauge de Progresso */}
                <div className="p-4 rounded-xl bg-atrio-border-light/40 border border-atrio-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-text-secondary">
                      Taxa de Conformidade Geral
                    </span>
                    <h4 className="text-xl font-bold text-atrio-navy">{reportData.summary.percentageFormatted} de Aceite</h4>
                    <p className="text-xs text-atrio-text-secondary">
                      {reportData.summary.totalAcknowledged} de {reportData.summary.totalTarget} colaboradores confirmaram a leitura.
                    </p>
                  </div>
                  <div className="w-full sm:w-48 bg-atrio-border rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-semantic-success h-full transition-all"
                      style={{ width: reportData.summary.percentageFormatted }}
                    />
                  </div>
                </div>

                {/* Tabela de Colaboradores */}
                <div className="overflow-x-auto border border-atrio-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-atrio-border-light text-atrio-navy font-bold border-b border-atrio-border">
                      <tr>
                        <th className="p-3">Colaborador</th>
                        <th className="p-3">Matrícula</th>
                        <th className="p-3">Departamento</th>
                        <th className="p-3">Status de Aceite</th>
                        <th className="p-3">Data / IP de Confirmação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-atrio-border/60">
                      {reportData.reportItems.map((item: any) => (
                        <tr key={item.employee.id} className="hover:bg-atrio-border-light/30">
                          <td className="p-3 font-bold text-atrio-text-primary">{item.employee.name}</td>
                          <td className="p-3 font-mono text-atrio-text-secondary">{item.employee.registrationNumber}</td>
                          <td className="p-3 text-atrio-text-secondary">{item.employee.department?.name || '—'}</td>
                          <td className="p-3">
                            {item.isAcknowledged ? (
                              <Badge variant="success" size="sm" dot>Confirmado</Badge>
                            ) : (
                              <Badge variant="warning" size="sm" dot>Pendente</Badge>
                            )}
                          </td>
                          <td className="p-3 text-atrio-text-secondary font-mono">
                            {item.isAcknowledged ? (
                              <span>
                                {new Date(item.acknowledgedAt).toLocaleString('pt-BR')} ({item.ipAddress})
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-atrio-text-secondary">
                Selecione um documento acima para visualizar o relatório de adesão.
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
