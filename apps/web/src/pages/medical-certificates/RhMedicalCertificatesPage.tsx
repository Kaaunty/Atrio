import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

interface RhCertificateItem {
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
  accumulatedDays?: number;
  isInssAlert?: boolean;
  employee: {
    id: string;
    name: string;
    registrationNumber: string;
    department?: { id: string; name: string } | null;
    position?: { id: string; title: string } | null;
  };
  rhReviewer?: { id: string; email: string } | null;
}

export const RhMedicalCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<RhCertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ENVIADO');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCert, setSelectedCert] = useState<RhCertificateItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Zoom & Rotação no visualizador de documentos
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationDegrees, setRotationDegrees] = useState(0);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab !== 'TODOS') params.status = activeTab;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/medical-certificates/rh', { params });
      setCertificates(res.data.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar atestados do RH:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCertificates();
  };

  const handleOpenDetailModal = async (certId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMsg(null);
      setReviewNotes('');
      setZoomLevel(1);
      setRotationDegrees(0);

      const res = await api.get(`/medical-certificates/rh/${certId}`);
      setSelectedCert(res.data.data);
      setIsModalOpen(true);
    } catch (err: any) {
      alert('Erro ao carregar detalhes do atestado médico');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCert) return;
    try {
      setActionLoading(true);
      setError(null);

      const res = await api.post(`/medical-certificates/rh/${selectedCert.id}/approve`, {
        rhReviewNotes: reviewNotes.trim() ? reviewNotes.trim() : null,
      });

      setSuccessMsg(res.data.message || 'Atestado médico aprovado e abonado no ponto!');
      fetchCertificates();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao aprovar atestado médico');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCert) return;
    if (!reviewNotes.trim()) {
      setError('Por favor, informe o motivo formal da rejeição.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      await api.post(`/medical-certificates/rh/${selectedCert.id}/reject`, {
        rhReviewNotes: reviewNotes.trim(),
      });

      setSuccessMsg('Atestado médico rejeitado.');
      fetchCertificates();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao rejeitar atestado médico');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!selectedCert) return;
    if (!reviewNotes.trim()) {
      setError('Por favor, informe o que precisa ser corrigido pelo colaborador.');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      await api.post(`/medical-certificates/rh/${selectedCert.id}/request-correction`, {
        rhReviewNotes: reviewNotes.trim(),
      });

      setSuccessMsg('Solicitação de correção enviada ao colaborador.');
      fetchCertificates();

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao solicitar correção do atestado');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return <Badge variant="success">Homologado (Abonado)</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger">Rejeitado</Badge>;
      case 'SOLICITADO_CORRECAO':
        return <Badge variant="warning">Correção Solicitada</Badge>;
      case 'EM_ANALISE_RH':
        return <Badge variant="info">Em Análise</Badge>;
      case 'ENVIADO':
      default:
        return <Badge variant="neutral">Pendente de Validação</Badge>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <AppLayout title="Homologação de Atestados RH">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Banner do Topo */}
        <div className="bg-gradient-to-r from-atrio-navy to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-atrio-teal/10 rounded-l-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-atrio-teal mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Módulo de Gestão LGPD & Saúde Ocupacional</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Painel de Homologação de Atestados
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Análise técnica, checagem de CRM, identificação de regras INSS (&gt;15 dias) e abono automático no espelho de ponto.
              </p>
            </div>
          </div>
        </div>

        {/* Abas e Filtros de Busca */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-atrio-border">
            {/* Abas */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              {[
                { key: 'ENVIADO', label: 'Pendentes' },
                { key: 'APROVADO', label: 'Homologados' },
                { key: 'SOLICITADO_CORRECAO', label: 'Em Correção' },
                { key: 'REJEITADO', label: 'Rejeitados' },
                { key: 'TODOS', label: 'Todos os Registros' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-atrio-navy text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Busca */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar colaborador ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-atrio-border rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>
              <Button variant="secondary" size="sm" type="submit">
                Filtrar
              </Button>
            </form>
          </div>

          {/* Tabela de Atestados para RH */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Carregando fila de atestados...
            </div>
          ) : certificates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm space-y-2">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-600">Nenhum atestado encontrado nesta fila.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-atrio-border text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Departamento</th>
                    <th className="py-3 px-4">Período Solicitado</th>
                    <th className="py-3 px-4">Dias</th>
                    <th className="py-3 px-4">Médico / CRM</th>
                    <th className="py-3 px-4">Status RH</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atrio-border">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-atrio-text-primary">{cert.employee?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Matrícula: {cert.employee?.registrationNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {cert.employee?.department?.name || '---'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {formatDate(cert.startDate)} até {formatDate(cert.endDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {cert.daysCount} dia(s)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium">{cert.doctorName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cert.crmNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(cert.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenDetailModal(cert.id)}
                          className="bg-atrio-navy hover:bg-slate-900 text-white font-bold"
                        >
                          Analisar Atestado
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Modal de Validação Técnica do RH com Visualizador Integrado */}
        {selectedCert && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Análise Técnica & Homologação de Atestado Médico"
            maxWidth="3xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Visualizador do Documento Anexo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-atrio-text-primary uppercase tracking-wider">
                    Documento Anexado
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1 text-slate-600">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotationDegrees((r) => (r + 90) % 360)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      title="Rotacionar 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <a
                      href={selectedCert.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors ml-1"
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Box de Pré-visualização com Zoom & Rotação */}
                <div className="h-96 border border-slate-200 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-4 relative">
                  <div
                    className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotationDegrees}deg)`,
                    }}
                  >
                    {selectedCert.documentUrl.endsWith('.pdf') ? (
                      <div className="text-center text-white space-y-2">
                        <FileText className="w-16 h-16 text-atrio-teal mx-auto" />
                        <p className="text-xs font-bold">Documento no formato PDF</p>
                        <a
                          href={selectedCert.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-atrio-teal text-atrio-navy-dark font-bold text-xs rounded-xl shadow hover:bg-atrio-teal-dark transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" /> Visualizar PDF em Nova Aba
                        </a>
                      </div>
                    ) : (
                      <img
                        src={selectedCert.documentUrl}
                        alt="Atestado médico escaneado"
                        className="max-h-80 object-contain rounded shadow-lg bg-white"
                        onError={(e) => {
                          // Fallback se a imagem não carregar
                          (e.target as any).src =
                            'https://placehold.co/600x800/0f172a/00d2b4?text=Visualizador+de+Atestado+Medico';
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Dados Detalhados & Ações de Homologação */}
              <div className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Operação Realizada!</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
                    </div>
                  </div>
                )}

                {/* Banner de Alerta INSS se > 15 dias */}
                {selectedCert.isInssAlert && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">Alerta de Encaminhamento ao INSS</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        O colaborador acumula <strong>{selectedCert.accumulatedDays} dias</strong> de afastamento por motivo de saúde nos últimos 60 dias. Ao aprovar, o sistema sinalizará encaminhamento à perícia do INSS.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card de Dados do Colaborador & Médico */}
                <div className="p-3.5 bg-slate-50 border border-atrio-border rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="font-bold text-atrio-text-primary text-sm">
                        {selectedCert.employee.name}
                      </span>
                      <span className="text-slate-500 ml-2 font-mono">
                        (Matrícula: {selectedCert.employee.registrationNumber})
                      </span>
                    </div>
                    {getStatusBadge(selectedCert.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Setor / Departamento:</span>
                      <span>{selectedCert.employee.department?.name || '---'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Cargo:</span>
                      <span>{selectedCert.employee.position?.title || '---'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Médico Emissor:</span>
                      <span className="font-bold text-slate-800">{selectedCert.doctorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">CRM / CRO:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedCert.crmNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-slate-700">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Período de Afastamento:</span>
                      <span className="font-bold text-atrio-text-primary">
                        {formatDate(selectedCert.startDate)} a {formatDate(selectedCert.endDate)} ({selectedCert.daysCount}d)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Código CID (LGPD):</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedCert.cidCode || 'Não informado'}
                      </span>
                    </div>
                  </div>

                  {selectedCert.notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block font-semibold text-[11px]">Observações do Colaborador:</span>
                      <p className="text-slate-700 italic mt-0.5">{selectedCert.notes}</p>
                    </div>
                  )}
                </div>

                {/* Seleção de Ação RH */}
                {selectedCert.status === 'ENVIADO' || selectedCert.status === 'EM_ANALISE_RH' ? (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-atrio-text-primary uppercase tracking-wider">
                      Parecer / Parecer da Análise RH *
                    </label>

                    <textarea
                      rows={2}
                      placeholder="Insira notas de homologação ou motivo da rejeição/correção..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                    />

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        <Check className="w-4 h-4" /> Homologar & Abonar
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRequestCorrection}
                        disabled={actionLoading}
                        className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold text-xs"
                      >
                        Pedir Correção
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="text-xs font-bold"
                      >
                        <X className="w-4 h-4" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-slate-700">Atestado já processado pelo RH</p>
                    {selectedCert.rhReviewNotes && (
                      <p className="text-slate-600 italic">Notas: {selectedCert.rhReviewNotes}</p>
                    )}
                    {selectedCert.rhReviewer && (
                      <p className="text-[11px] text-slate-400">
                        Analisado por: {selectedCert.rhReviewer.email} em {formatDate(selectedCert.reviewedAt || '')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
};
