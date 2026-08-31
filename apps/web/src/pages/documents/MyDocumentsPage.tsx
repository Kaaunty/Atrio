import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  Check,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

export interface DocumentItem {
  id: string;
  documentType: {
    id: string;
    name: string;
    code: string;
    isInstitutional: boolean;
    requiresReadAcknowledgement: boolean;
  };
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  referenceMonth?: number | null;
  referenceYear?: number | null;
  expirationDate?: string | null;
  visibility: string;
  createdAt: string;
  requiresReadAcknowledgement: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: string | null;
}

export const MyDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Modal de Leitura e Aceite
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeCategory !== 'TODOS') params.typeCode = activeCategory;
      if (selectedYear !== 'ALL') params.year = selectedYear;
      if (unreadOnly) params.unreadOnly = true;

      const res = await api.get('/documents/me', { params });
      setDocuments(res.data.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeCategory, selectedYear, unreadOnly]);

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setError(null);
      const res = await api.get(`/documents/${doc.id}/download`);
      const data = res.data.data;

      // Em ambiente de produção dispararia o download ou abriria a URL assinada
      const link = document.createElement('a');
      link.href = data.fileUrl || '#';
      link.target = '_blank';
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg(`Download do arquivo '${doc.fileName}' autorizado e registrado na auditoria.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao realizar download do documento');
    }
  };

  const handleOpenAcknowledgeModal = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setIsAgreed(false);
    setError(null);
    setIsModalOpen(true);
  };

  const handleConfirmAcknowledge = async () => {
    if (!selectedDoc || !isAgreed) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.post(`/documents/${selectedDoc.id}/acknowledge`);

      setSuccessMsg(`Aceite e confirmação de leitura registrados com sucesso para '${selectedDoc.title}'.`);
      setIsModalOpen(false);
      fetchDocuments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar aceite de leitura');
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchTerm.trim()) return true;
    return (
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <AppLayout title="Central de Documentos do Colaborador">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-atrio-border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-atrio-navy">Meus Documentos &amp; Comprovantes</h1>
              <Badge variant="teal" size="sm">LGPD Auditado</Badge>
            </div>
            <p className="text-xs text-atrio-text-secondary mt-1">
              Acesse seus contracheques, informes de rendimentos, contratos e confirme leitura de políticas internas.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-atrio-teal-dark bg-atrio-teal-light px-3 py-2 rounded-lg font-medium">
            <ShieldCheck className="w-4 h-4 text-atrio-teal-dark" />
            <span>Acesso individual e criptografado</span>
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

        {/* Filtros e Abas por Categoria */}
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atrio-border pb-3">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { code: 'TODOS', label: 'Todos os Documentos' },
                { code: 'HOLERITE', label: 'Holerites' },
                { code: 'INFORME_IR', label: 'Informe de IR' },
                { code: 'CONTRATO', label: 'Contratos' },
                { code: 'POLITICA_INTERNA', label: 'Políticas da Empresa' },
              ].map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setActiveCategory(cat.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat.code
                      ? 'bg-atrio-navy text-white shadow-sm'
                      : 'text-atrio-text-secondary hover:bg-atrio-border-light'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-atrio-text-secondary cursor-pointer select-none font-medium">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-atrio-border text-atrio-teal-dark focus:ring-atrio-teal"
                />
                Apenas Pendentes de Aceite
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Buscar por título do documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-atrio-text-secondary" />}
              />
            </div>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { value: 'ALL', label: 'Todos os Anos' },
                { value: '2026', label: 'Exercício 2026' },
                { value: '2025', label: 'Exercício 2025' },
                { value: '2024', label: 'Exercício 2024' },
              ]}
            />
          </div>
        </Card>

        {/* Lista de Documentos */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-atrio-border">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs text-atrio-text-secondary">Carregando documentos da central...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-atrio-border space-y-2">
            <FileText className="w-10 h-10 text-atrio-text-secondary/40 mx-auto" />
            <h3 className="text-sm font-bold text-atrio-navy">Nenhum documento encontrado</h3>
            <p className="text-xs text-atrio-text-secondary max-w-sm mx-auto">
              Não existem documentos cadastrados nesta categoria ou ano selecionado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className={`space-y-4 border-l-4 transition-all ${
                  doc.requiresReadAcknowledgement && !doc.isAcknowledged
                    ? 'border-l-semantic-warning shadow-md'
                    : 'border-l-atrio-teal'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-atrio-teal-light text-atrio-teal-dark shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-text-secondary block">
                        {doc.documentType.name}
                      </span>
                      <h4 className="text-sm font-bold text-atrio-navy leading-snug line-clamp-1">
                        {doc.title}
                      </h4>
                    </div>
                  </div>
                  {doc.requiresReadAcknowledgement && (
                    doc.isAcknowledged ? (
                      <Badge variant="success" size="sm" dot>Aceito</Badge>
                    ) : (
                      <Badge variant="warning" size="sm" dot>Pendente</Badge>
                    )
                  )}
                </div>

                {doc.description && (
                  <p className="text-xs text-atrio-text-secondary leading-relaxed line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="text-[11px] text-atrio-text-secondary space-y-1 bg-atrio-border-light/50 p-2.5 rounded-lg border border-atrio-border/40">
                  <div className="flex justify-between">
                    <span>Arquivo:</span>
                    <span className="font-mono text-atrio-text-primary truncate max-w-[140px]">{doc.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tamanho:</span>
                    <span className="font-semibold text-atrio-text-primary">{formatFileSize(doc.fileSize)}</span>
                  </div>
                  {doc.referenceMonth && doc.referenceYear && (
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span className="font-semibold text-atrio-text-primary">
                        {String(doc.referenceMonth).padStart(2, '0')}/{doc.referenceYear}
                      </span>
                    </div>
                  )}
                  {doc.isAcknowledged && doc.acknowledgedAt && (
                    <div className="flex justify-between text-semantic-success font-medium pt-1 border-t border-atrio-border/60">
                      <span>Aceito em:</span>
                      <span>{new Date(doc.acknowledgedAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Baixar
                  </Button>

                  {doc.requiresReadAcknowledgement && !doc.isAcknowledged && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 bg-semantic-warning hover:bg-semantic-warning/90 text-white"
                      onClick={() => handleOpenAcknowledgeModal(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ler &amp; Aceitar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Confirmação de Leitura e Aceite Termos */}
        {selectedDoc && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Confirmação de Leitura & Aceite de Política"
            maxWidth="2xl"
          >
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-atrio-teal-light/40 border border-atrio-teal/20 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-teal-dark">
                  {selectedDoc.documentType.name}
                </span>
                <h3 className="text-base font-bold text-atrio-navy">{selectedDoc.title}</h3>
                {selectedDoc.description && (
                  <p className="text-xs text-atrio-text-secondary leading-relaxed">{selectedDoc.description}</p>
                )}
                <div className="pt-2">
                  <a
                    href={selectedDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-atrio-teal-dark font-bold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Visualizar documento completo ({selectedDoc.fileName})
                  </a>
                </div>
              </div>

              {/* Termo Jurídico de Aceite */}
              <div className="p-4 rounded-xl bg-white border border-atrio-border space-y-3">
                <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider">Termo de Aceite Eletrônico</h4>
                <p className="text-xs text-atrio-text-secondary leading-relaxed">
                  Ao clicar em &quot;Confirmar Aceite&quot;, você declara que realizou a leitura integral deste documento,
                  compreendeu suas regras e diretrizes corporativas e está de pleno acordo com seu conteúdo. O registro
                  deste aceite armazenará de forma imutável a data, hora, seu IP de acesso e identificador de usuário.
                </p>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-atrio-border text-atrio-teal focus:ring-atrio-teal"
                  />
                  <span className="text-xs font-semibold text-atrio-text-primary">
                    Declaro que li, compreendi e concordo integralmente com os termos deste documento.
                  </span>
                </label>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-atrio-border">
                <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!isAgreed || actionLoading}
                  onClick={handleConfirmAcknowledge}
                >

                  {actionLoading ? (
                    'Registrando...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar Aceite &amp; Registrar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
};
