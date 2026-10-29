import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Search,
  Check,
  X,
  FolderPlus,
  Info,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { Tabs } from '../ui/Tabs';
import { Company } from '../../services/organizationService';
import { Employee, employeeService } from '../../services/employeeService';
import {
  employeeImportService,
  ImportPreviewResponse,
} from '../../services/employeeImportService';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  initialCompanyId?: string;
  onSuccess: (count: number) => void;
}

type Step = 'upload' | 'preview' | 'result';
type PreviewTab = 'records' | 'managers' | 'departments';

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  companies,
  initialCompanyId = '',
  onSuccess,
}) => {
  // Step navigation
  const [currentStep, setCurrentStep] = useState<Step>('upload');

  // Step 1: Upload state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emailDomain, setEmailDomain] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Preview state
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<PreviewTab>('records');
  const [recordsFilter, setRecordsFilter] = useState<'all' | 'valid' | 'errors'>('all');
  const [recordsSearch, setRecordsSearch] = useState<string>('');

  // Manager resolutions mapping: rawName -> matchedEmployeeId (or null for "Sem gestor")
  const [managerResolutions, setManagerResolutions] = useState<Record<string, string | null>>({});

  // Existing employees for Manager SearchableSelect
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Step 3: Confirm state
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    totalCreated?: number;
    totalUpdated?: number;
    errors?: Array<{ row?: number; name?: string; message: string }>;
  } | null>(null);

  // Sync initialCompanyId
  useEffect(() => {
    if (initialCompanyId && !selectedCompanyId) {
      setSelectedCompanyId(initialCompanyId);
    }
  }, [initialCompanyId]);

  // Fetch company employees when previewData is loaded for manager matching dropdowns
  useEffect(() => {
    if (isOpen && selectedCompanyId) {
      const fetchEmployees = async () => {
        try {
          setLoadingEmployees(true);
          const response = await employeeService.getEmployees({
            companyId: selectedCompanyId,
            pageSize: 500,
          });
          setAvailableEmployees(response.data || []);
        } catch (err) {
          console.error('Falha ao buscar colaboradores da empresa:', err);
        } finally {
          setLoadingEmployees(false);
        }
      };
      fetchEmployees();
    }
  }, [isOpen, selectedCompanyId]);

  // Reset state on close
  const handleClose = () => {
    if (confirming) return;
    setCurrentStep('upload');
    setSelectedFile(null);
    setUploadError(null);
    setPreviewData(null);
    setManagerResolutions({});
    setImportResult(null);
    setActiveTab('records');
    setRecordsSearch('');
    setRecordsFilter('all');
    onClose();
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setUploadError('Por favor selecione um arquivo Excel válido (.xlsx ou .xls).');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('O arquivo selecionado é maior que o limite de 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  // Run Preview
  const handleGeneratePreview = async () => {
    if (!selectedCompanyId) {
      setUploadError('Por favor, selecione a empresa de destino.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Por favor, anexe a planilha .xlsx para continuar.');
      return;
    }

    setLoadingPreview(true);
    setUploadError(null);

    try {
      const data = await employeeImportService.previewImport(
        selectedFile,
        selectedCompanyId,
        emailDomain.trim() || undefined,
        updateExisting
      );

      setPreviewData(data);

      if (data.suggestedDomain && !emailDomain) {
        setEmailDomain(data.suggestedDomain);
      }

      // Initialize manager resolutions with matches suggested by backend
      const initialResolutions: Record<string, string | null> = {};
      const allManagersList = [
        ...(data.managers?.resolved || []),
        ...(data.managers?.unresolved || []),
      ];
      allManagersList.forEach((m) => {
        initialResolutions[m.rawName] = m.matchedEmployeeId || null;
      });
      setManagerResolutions(initialResolutions);

      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Erro na pré-visualização:', err);
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          'Falha ao processar arquivo. Verifique se o formato das colunas está correto.'
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!previewData || !selectedCompanyId) return;

    setConfirming(true);
    try {
      const result = await employeeImportService.confirmImport({
        companyId: selectedCompanyId,
        emailDomain: emailDomain.trim() || undefined,
        updateExisting,
        managerResolutions,
        records: previewData.records,
      });

      setImportResult(result);
      setCurrentStep('result');
      if (result.importedCount > 0) {
        onSuccess(result.importedCount);
      }
    } catch (err: any) {
      console.error('Erro ao confirmar importação:', err);
      setImportResult({
        importedCount: 0,
        errors: [
          {
            message:
              err.response?.data?.message ||
              err.message ||
              'Ocorreu um erro ao persistir os dados da importação.',
          },
        ],
      });
      setCurrentStep('result');
    } finally {
      setConfirming(false);
    }
  };

  // Manager selectable options
  const managerOptions: SearchableOption[] = useMemo(() => {
    const list: SearchableOption[] = [
      {
        value: '__NONE__',
        label: 'Sem gestor (Nenhum)',
        subLabel: 'Não vincular a nenhum gestor',
      },
    ];

    availableEmployees.forEach((emp) => {
      list.push({
        value: emp.id,
        label: emp.name,
        subLabel: `${emp.position?.title || 'Sem cargo'} • ${emp.department?.name || 'Sem setor'} (Matrícula: ${emp.registrationNumber})`,
      });
    });

    return list;
  }, [availableEmployees]);

  // Filtered preview records
  const filteredRecords = useMemo(() => {
    if (!previewData) return [];
    const list = previewData.records || previewData.employees || [];
    return list.filter((rec) => {
      if (recordsFilter === 'valid' && !rec.isValid) return false;
      if (recordsFilter === 'errors' && rec.isValid) return false;

      if (recordsSearch.trim()) {
        const term = recordsSearch.toLowerCase();
        const matchesName = rec.name?.toLowerCase().includes(term);
        const matchesCpf = rec.cpf?.toLowerCase().includes(term);
        const matchesEmail = rec.email?.toLowerCase().includes(term);
        const matchesDept = rec.departmentName?.toLowerCase().includes(term);
        return Boolean(matchesName || matchesCpf || matchesEmail || matchesDept);
      }

      return true;
    });
  }, [previewData, recordsFilter, recordsSearch]);

  const allManagersList = useMemo(() => {
    if (!previewData) return [];
    if (Array.isArray(previewData.managers)) return previewData.managers;
    return [
      ...(previewData.managers?.resolved || []),
      ...(previewData.managers?.unresolved || []),
    ];
  }, [previewData]);

  const unresolvedManagersCount = useMemo(() => {
    if (!previewData) return 0;
    return allManagersList.filter((m) => {
      const resolution = managerResolutions[m.rawName];
      return resolution === undefined && !m.matchedEmployeeId;
    }).length;
  }, [previewData, allManagersList, managerResolutions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importação de Colaboradores via Planilha"
      subtitle="Cadastre múltiplos colaboradores em massa a partir de um arquivo Excel (.xlsx)"
      maxWidth="5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {currentStep === 'preview' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('upload')}
                disabled={confirming}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Voltar ao Arquivo
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleClose}
              disabled={confirming}
            >
              {currentStep === 'result' ? 'Concluir' : 'Cancelar'}
            </Button>

            {currentStep === 'upload' && (
              <Button
                variant="primary"
                size="md"
                onClick={handleGeneratePreview}
                disabled={!selectedFile || !selectedCompanyId || loadingPreview}
                icon={
                  loadingPreview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                }
              >
                {loadingPreview ? 'Processando...' : 'Pré-visualizar Dados'}
              </Button>
            )}

            {currentStep === 'preview' && (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmImport}
                disabled={confirming || (previewData?.summary.validCount === 0)}
                icon={
                  confirming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )
                }
              >
                {confirming
                  ? 'Importando...'
                  : `Confirmar Importação (${previewData?.summary.validCount || 0} válidos)`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Stepper Progress */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
              currentStep === 'upload'
                ? 'bg-atrio-navy text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {currentStep !== 'upload' ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span
            className={`text-xs font-medium ${
              currentStep === 'upload' ? 'text-atrio-text-primary font-bold' : 'text-slate-500'
            }`}
          >
            Upload da Planilha
          </span>
        </div>

        <div className="h-0.5 flex-1 bg-slate-100 mx-4 max-w-[80px]" />

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
              currentStep === 'preview'
                ? 'bg-atrio-navy text-white'
                : currentStep === 'result'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {currentStep === 'result' ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span
            className={`text-xs font-medium ${
              currentStep === 'preview' ? 'text-atrio-text-primary font-bold' : 'text-slate-500'
            }`}
          >
            Validação & De-Para
          </span>
        </div>

        <div className="h-0.5 flex-1 bg-slate-100 mx-4 max-w-[80px]" />

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
              currentStep === 'result'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            3
          </div>
          <span
            className={`text-xs font-medium ${
              currentStep === 'result' ? 'text-atrio-text-primary font-bold' : 'text-slate-500'
            }`}
          >
            Resultado
          </span>
        </div>
      </div>

      {/* STEP 1: UPLOAD & CONFIGURATION */}
      {currentStep === 'upload' && (
        <div className="space-y-5">
          {uploadError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{uploadError}</div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Empresa de Destino *"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              options={[
                { value: '', label: 'Selecione uma empresa...' },
                ...companies.map((c) => ({ value: c.id, label: c.tradeName || c.legalName })),
              ]}
              helperText="Os colaboradores serão vinculados à empresa selecionada"
              required
            />

            <Input
              label="Domínio de E-mail Corporativo (Opcional)"
              placeholder="ex: suaempresa.com.br"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              helperText="Usado para autocompletar e-mails sem domínio ou sugerir e-mails corporativos"
            />
          </div>

          {/* Opção para atualizar existentes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 transition-colors hover:border-slate-300">
            <input
              type="checkbox"
              id="updateExistingCheckbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-atrio-navy focus:ring-atrio-navy focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="updateExistingCheckbox" className="flex-1 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-800 block">
                Substituir informações de colaboradores existentes
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block leading-relaxed">
                Caso o CPF ou colaborador já esteja cadastrado no sistema, os dados cadastrais (setor, salário, endereço, telefone, gestor) serão atualizados com as informações da planilha, em vez de acusar erro de duplicidade.
              </span>
            </label>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-atrio-navy bg-slate-50 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {selectedFile ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Clique ou arraste outro arquivo para trocar
                  </p>
                </div>
                <Badge variant="success">Arquivo pronto para validação</Badge>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Clique para selecionar ou arraste o arquivo Excel aqui
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos suportados: .xlsx, .xls (Tamanho máximo: 10MB)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Formato de Colunas Esperado / Dicas */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Info className="w-4 h-4 text-atrio-navy" />
              <span>Colunas reconhecidas na planilha:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Obrigatórias:</strong> Nome Completo, CPF, E-mail.<br />
              <strong>Recomendadas:</strong> Matrícula / Código, Setor / Departamento, Gestor / Supervisor, Salário, Telefone.<br />
              <em>Obs:</em> Cabeçalhos com acentos e variações comuns são identificados automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & MAPPING */}
      {currentStep === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Summary Badges Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Total de Linhas
              </span>
              <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                {previewData.summary.totalRows}
              </span>
            </div>

            {(previewData.summary.toUpdateRows !== undefined && previewData.summary.toUpdateRows > 0) ? (
              <>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Novos Cadastros
                  </span>
                  <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                    {previewData.summary.toCreateRows ?? (previewData.summary.validCount - (previewData.summary.toUpdateRows || 0))}
                  </span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Atualizações
                  </span>
                  <span className="text-xl font-bold text-amber-800 mt-0.5 block">
                    {previewData.summary.toUpdateRows}
                  </span>
                </div>
              </>
            ) : (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3">
                <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Válidos
                </span>
                <span className="text-xl font-bold text-emerald-800 mt-0.5 block">
                  {previewData.summary.validCount}
                </span>
              </div>
            )}

            <div className="bg-red-50/60 border border-red-200 rounded-lg p-3">
              <span className="text-[11px] font-medium text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Inconsistências
              </span>
              <span className="text-xl font-bold text-red-800 mt-0.5 block">
                {previewData.summary.errorCount}
              </span>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
              <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Novos Setores
              </span>
              <span className="text-xl font-bold text-blue-800 mt-0.5 block">
                {previewData.departments.toCreate.length}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            tabs={[
              {
                id: 'records',
                label: 'Colaboradores',
                badge: previewData.records.length,
              },
              {
                id: 'managers',
                label: 'De-Para de Gestores',
                badge: unresolvedManagersCount > 0 ? `${unresolvedManagersCount} pendentes` : undefined,
              },
              {
                id: 'departments',
                label: 'Departamentos',
                badge: previewData.departments.toCreate.length > 0 ? `+${previewData.departments.toCreate.length}` : undefined,
              },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as PreviewTab)}
          />

          {/* TAB 1: RECORDS TABLE */}
          {activeTab === 'records' && (
            <div className="space-y-3">
              {/* Filter and Search controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Buscar nesta lista..."
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Button
                    variant={recordsFilter === 'all' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setRecordsFilter('all')}
                  >
                    Todos ({previewData.records.length})
                  </Button>
                  <Button
                    variant={recordsFilter === 'valid' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setRecordsFilter('valid')}
                  >
                    Válidos ({previewData.summary.validCount})
                  </Button>
                  <Button
                    variant={recordsFilter === 'errors' ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => setRecordsFilter('errors')}
                  >
                    Com Erros ({previewData.summary.errorCount})
                  </Button>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse table-auto">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10 shadow-sm">
                    <tr>
                      <th className="py-2.5 px-3 w-20">Status</th>
                      <th className="py-2.5 px-3 w-20">Ação</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Colaborador</th>
                      <th className="py-2.5 px-3 w-28 whitespace-nowrap">CPF</th>
                      <th className="py-2.5 px-3 min-w-[200px]">E-mail Corporativo</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Setor</th>
                      <th className="py-2.5 px-3 max-w-[180px] min-w-[140px]">Gestor Planilha</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Alertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Nenhum registro encontrado para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => (
                        <tr
                          key={rec.row}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !rec.isValid ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3 whitespace-nowrap">
                            {rec.isValid ? (
                              <Badge variant="success" size="sm">
                                Válido
                              </Badge>
                            ) : (
                              <Badge variant="danger" size="sm">
                                Inválido
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {rec.action === 'UPDATE' ? (
                              <Badge variant="warning" size="sm">
                                Atualizar
                              </Badge>
                            ) : (
                              <Badge variant="info" size="sm">
                                Novo
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            <span className="block truncate max-w-[240px]" title={rec.name}>
                              {rec.name || <span className="text-slate-400 italic">Vazio</span>}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-slate-600">
                            {rec.cpf ? rec.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : <span className="text-slate-400 italic">-</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            <span className="block truncate max-w-[240px] font-mono text-[11px]" title={rec.email}>
                              {rec.email || <span className="text-slate-400 italic">Vazio</span>}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                              {rec.departmentName || '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-[180px]">
                            <span
                              className="block truncate text-[11px]"
                              title={rec.managerRawName || ''}
                            >
                              {rec.managerRawName || <span className="text-slate-400">-</span>}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {rec.errors && rec.errors.length > 0 ? (
                              <div className="space-y-0.5">
                                {rec.errors.map((err, i) => (
                                  <div
                                    key={i}
                                    className="text-[11px] text-red-600 flex items-center gap-1"
                                  >
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGERS DE-PARA */}
          {activeTab === 'managers' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <p>
                  Associe os gestores informados na coluna de gestor da planilha a colaboradores
                  cadastrados no sistema ou que estejam sendo importados.
                </p>
              </div>

              {allManagersList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum gestor foi referenciado na planilha.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                  {allManagersList.map((m) => {
                    const currentVal =
                      managerResolutions[m.rawName] === null
                        ? '__NONE__'
                        : managerResolutions[m.rawName] || '';

                    return (
                      <div
                        key={m.rawName}
                        className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white hover:bg-slate-50/50"
                      >
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800">
                              {m.rawName}
                            </span>
                            <Badge variant="neutral" size="sm">
                              {m.count} colaboradores
                            </Badge>
                          </div>
                          {m.matchedEmployeeName ? (
                            <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Match sugerido: {m.matchedEmployeeName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              Nenhum colaborador com este nome exato
                            </span>
                          )}
                        </div>

                        <div className="w-full md:w-80">
                          <SearchableSelect
                            placeholder="Vincular a colaborador..."
                            options={managerOptions}
                            value={currentVal}
                            loading={loadingEmployees}
                            onChange={(val) => {
                              setManagerResolutions((prev) => ({
                                ...prev,
                                [m.rawName]: val === '__NONE__' ? null : val,
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* To Create */}
                <div className="border border-blue-200 bg-blue-50/20 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-blue-900 flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                      Setores que serão criados automaticamente ({previewData.departments.toCreate.length})
                    </span>
                  </div>
                  {previewData.departments.toCreate.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum novo setor será criado. Todos já existem no sistema.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-700 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {previewData.departments.toCreate.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded border border-blue-100"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate">{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Existing */}
                <div className="border border-slate-200 bg-slate-50/30 rounded-lg p-3.5 space-y-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      Setores existentes mapeados ({previewData.departments.existing.length})
                    </span>
                  </div>
                  {previewData.departments.existing.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum setor existente mapeado.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-600 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {previewData.departments.existing.map((d, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded border border-slate-200"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <span className="truncate">{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: RESULT */}
      {currentStep === 'result' && (
        <div className="py-6 text-center space-y-4">
          {importResult && importResult.importedCount > 0 ? (
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
          )}

          <div>
            <h4 className="text-base font-bold text-slate-800">
              {importResult && importResult.importedCount > 0
                ? 'Importação Concluída com Sucesso!'
                : 'Importação Finalizada com Alertas'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {(importResult?.totalUpdated !== undefined && importResult.totalUpdated > 0) ? (
                <>
                  Foram processados <strong className="text-slate-700">{importResult?.importedCount || 0}</strong> colaboradores com sucesso:{' '}
                  <strong className="text-emerald-700">{importResult.totalCreated ?? 0} novos colaboradores cadastrados</strong> e{' '}
                  <strong className="text-amber-700">{importResult.totalUpdated} colaboradores atualizados com sucesso</strong>.
                </>
              ) : (
                <>
                  Foram cadastrados e vinculados com sucesso{' '}
                  <strong className="text-slate-700">{importResult?.importedCount || 0}</strong>{' '}
                  colaboradores.
                </>
              )}
            </p>
          </div>

          {importResult?.errors && importResult.errors.length > 0 && (
            <div className="max-w-lg mx-auto text-left bg-red-50 border border-red-200 rounded-lg p-3.5 space-y-2">
              <span className="font-semibold text-xs text-red-800 block">
                Ocorrências durante a importação ({importResult.errors.length}):
              </span>
              <ul className="space-y-1 text-[11px] text-red-700 max-h-40 overflow-y-auto">
                {importResult.errors.map((e, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {e.row ? `Linha ${e.row}: ` : ''}
                      {e.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
