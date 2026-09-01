import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  Info,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

interface CertificateItem {
  id: string;
  startDate: string;
  daysCount: number;
  endDate: string;
  issueDate: string;
  doctorName: string;
  crmNumber: string;
  cidCode?: string | null;
  reasonCategory: string;
  notes?: string | null;
  documentUrl: string;
  status: 'ENVIADO' | 'EM_ANALISE_RH' | 'APROVADO' | 'REJEITADO' | 'SOLICITADO_CORRECAO';
  rhReviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

const REASON_CATEGORIES = [
  { value: 'CONSULTA', label: 'Consulta Médica / Odontológica' },
  { value: 'EXAME', label: 'Exame de Rotina / Diagnóstico' },
  { value: 'DOENCA_ATE_15D', label: 'Incapacidade por Doença (Até 15 dias)' },
  { value: 'DOENCA_SUPERIOR_15D', label: 'Incapacidade por Doença (Superior a 15 dias)' },
  { value: 'ACIDENTE_TRABALHO', label: 'Acidente de Trabalho / Trajeto' },
  { value: 'MATERNIDADE', label: 'Licença Maternidade' },
  { value: 'ACOMPANHAMENTO_FAMILIAR', label: 'Acompanhamento Familiar (Filho/Dependente)' },
  { value: 'DOACAO_SANGUE', label: 'Doação de Sangue' },
  { value: 'OUTROS', label: 'Outros Motivos Legais' },
];

export const SubmitCertificatePage: React.FC = () => {
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos do formulário
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [daysCount, setDaysCount] = useState(1);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [doctorName, setDoctorName] = useState('');
  const [crmNumber, setCrmNumber] = useState('');
  const [cidCode, setCidCode] = useState('');
  const [reasonCategory, setReasonCategory] = useState('DOENCA_ATE_15D');
  const [notes, setNotes] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/medical-certificates/me');
      setCertificates(res.data.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar atestados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const urlToUse = documentUrl.trim()
        ? documentUrl
        : `https://storage.atrio.com/atestados/cert_${Date.now()}.pdf`;

      await api.post('/medical-certificates', {
        startDate,
        daysCount: Number(daysCount),
        issueDate,
        doctorName: doctorName.trim(),
        crmNumber: crmNumber.trim(),
        cidCode: cidCode.trim() ? cidCode.trim() : null,
        reasonCategory,
        notes: notes.trim() ? notes.trim() : null,
        documentUrl: urlToUse,
      });

      setSuccessMsg('Atestado enviado com sucesso! Ele foi encaminhado para a fila de validação do RH.');
      fetchCertificates();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
        resetForm();
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar atestado médico');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStartDate(new Date().toISOString().substring(0, 10));
    setDaysCount(1);
    setIssueDate(new Date().toISOString().substring(0, 10));
    setDoctorName('');
    setCrmNumber('');
    setCidCode('');
    setReasonCategory('DOENCA_ATE_15D');
    setNotes('');
    setDocumentUrl('');
    setError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="success">Homologado (Abonado)</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger">Rejeitado pelo RH</Badge>;
      case 'SOLICITADO_CORRECAO':
        return <Badge variant="warning">Ajuste Solicitado</Badge>;
      case 'EM_ANALISE_RH':
        return <Badge variant="info">Em Análise RH</Badge>;
      case 'ENVIADO':
      default:
        return <Badge variant="neutral">Enviado (Aguardando RH)</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <AppLayout title="Enviar Atestado Médico">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Banner do Topo com Glassmorphism & Botão de Envio */}
        <div className="bg-gradient-to-r from-atrio-navy to-slate-900 text-white rounded-2xl p-4 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-atrio-teal/10 rounded-l-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-atrio-teal mb-3">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Proteção LGPD • Comunicação Direta com o RH</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Envio Seguro de Atestados Médicos
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
                Envie a foto ou documento do seu atestado para justificativa de faltas ou consultas. O envio é recebido diretamente pela equipe de RH / Saúde Ocupacional.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-atrio-teal hover:bg-atrio-teal-dark text-atrio-navy-dark font-bold shadow-lg shadow-atrio-teal/20 border-0"
            >
              <Plus className="w-5 h-5" />
              Enviar Novo Atestado
            </Button>
          </div>
        </div>

        {/* Alerta de Diretrizes LGPD */}
        <div className="p-4 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-slate-700 text-xs flex items-start gap-3.5 shadow-sm">
          <div className="p-2 bg-sky-100 text-sky-700 rounded-xl shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sky-950 text-xs sm:text-sm">
              Privacidade e Proteção de Dados Médicos (LGPD)
            </p>
            <p className="text-slate-600 leading-relaxed">
              Conforme o Artigo 11 da LGPD, os documentos de saúde anexados nesta plataforma são de acesso restrito ao Recursos Humanos e Medicina do Trabalho. O seu gestor imediato visualizará apenas o período da ausência para planejamento de escala.
            </p>
          </div>
        </div>

        {/* Tabela de Histórico de Atestados Enviados */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-atrio-text-primary flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-atrio-teal shrink-0" />
                <span>Histórico de Atestados Enviados</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Acompanhe o status de homologação dos seus atestados junto ao RH
              </p>
            </div>
            <div className="self-start sm:self-auto">
              <Badge variant="info">{certificates.length} atestado(s) registrado(s)</Badge>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Carregando atestados...
            </div>
          ) : certificates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm space-y-2.5">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700 text-sm">Nenhum atestado enviado até o momento.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Clique no botão &quot;Enviar Novo Atestado&quot; acima para registrar sua primeira ausência médica.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-atrio-border text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Período de Repouso</th>
                    <th className="py-3 px-4">Dias</th>
                    <th className="py-3 px-4">Categoria / Motivo</th>
                    <th className="py-3 px-4">Médico / CRM</th>
                    <th className="py-3 px-4">Emissão</th>
                    <th className="py-3 px-4">Status RH</th>
                    <th className="py-3 px-4">Observações do RH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atrio-border">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-atrio-text-primary whitespace-nowrap">
                        {formatDate(cert.startDate)} até {formatDate(cert.endDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {cert.daysCount} dia(s)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {REASON_CATEGORIES.find((r) => r.value === cert.reasonCategory)?.label ||
                            cert.reasonCategory}
                        </span>
                        {cert.cidCode && (
                          <span className="ml-2 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border text-slate-600">
                            CID: {cert.cidCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {cert.doctorName}
                        <div className="text-[11px] text-slate-400 font-mono">{cert.crmNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(cert.issueDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(cert.status)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {cert.rhReviewNotes ? (
                          <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px]">
                            {cert.rhReviewNotes}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Em processamento...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal de Envio de Atestado */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Enviar Novo Atestado Médico / Justificativa"
          maxWidth="2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Envio Concluído!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Quantidade de Dias *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={daysCount}
                      onChange={(e) => setDaysCount(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Data de Emissão *
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Nome do Médico / Profissional *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Dr. Roberto Santos"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      CRM / CRO (Registro Profissional) *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CRM/SP 123456"
                      value={crmNumber}
                      onChange={(e) => setCrmNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Categoria do Motivo *
                    </label>
                    <select
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                    >
                      {REASON_CATEGORIES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                      Código CID (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: J06, M54.5"
                      value={cidCode}
                      onChange={(e) => setCidCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Observações / Informações Adicionais
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Descreva detalhes que ajudem na identificação ou homologação do seu atestado..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>

                {/* Simulador de Upload de Documento / Foto */}
                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Anexo do Atestado (Foto ou PDF) *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-atrio-teal mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">
                      Arraste e solte o arquivo do atestado aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Formatos aceitos: JPG, PNG, PDF (Máx. 10MB)
                    </p>
                  </div>
                  <input
                    type="url"
                    placeholder="Ou insira o link/URL da imagem escaneada (ex: https://...)"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs mt-2 focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? 'Enviando Documento...' : 'Enviar Atestado ao RH'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
};
