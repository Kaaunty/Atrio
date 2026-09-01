import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TimeClockDeviceItem, SyncResult, integrationService } from '../../services/integrationService';
import { FileUp, CheckCircle2, AlertTriangle, XCircle, FileText, Upload } from 'lucide-react';

interface AfdUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  devices: TimeClockDeviceItem[];
  integrationKey?: string;
}

export const AfdUploadModal: React.FC<AfdUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  devices,
  integrationKey = 'control_id',
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [linesCount, setLinesCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult(null);
    setProgressText('');
    setProgressPercent(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      setLinesCount(lines.length);
    };
    reader.onerror = () => {
      setError('Falha ao ler arquivo local');
    };
    reader.readAsText(file);
  };

  const normalizeAfdLine = (line: string): string => {
    const trimmed = line.trim();
    if (!trimmed) return '';

    // 1. Linhas já delimitadas (CSV / ponto e vírgula / vírgula)
    if (trimmed.includes(';') || trimmed.includes(',')) {
      return trimmed;
    }

    // 2. Cabeçalho (Tipo 1) ou Trailer (Tipo 9): repassa intacto
    if (trimmed.length >= 10 && (trimmed[9] === '1' || trimmed[9] === '9')) {
      return trimmed;
    }

    // 3. Formato Control iD / Portaria 671 (Tipo 3, 7, 4 ou 5) com Timestamp ISO "YYYY-MM-DDTHH:mm:ss"
    // Ex real: 00000000132025-05-21T16:39:00-0300021394413442C1AC
    if (trimmed.length >= 35 && (trimmed[9] === '3' || trimmed[9] === '7' || trimmed[9] === '4' || trimmed[9] === '5')) {
      const candidateDate = trimmed.substring(10, 34).trim();
      if (candidateDate.includes('-') && candidateDate.includes('T')) {
        const formattedDateStr = candidateDate.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
        const d = new Date(formattedDateStr);
        if (!isNaN(d.getTime())) {
          // Identificador (PIS/CPF) nas posições 34 a 46
          const rawId = trimmed.length >= 46 ? trimmed.substring(34, 46).trim() : trimmed.substring(34).trim();
          const digitsOnly = rawId.replace(/\D/g, '');
          const idToUse = digitsOnly || rawId;
          if (idToUse) {
            return `${idToUse};${d.toISOString()}`;
          }
        }
      }
    }

    // 4. Formato Legado Portaria 1510 com [DDMMAAAA][HHMM]
    // Ex: 0000000013010620240800000123456789
    if (trimmed.length >= 22 && (trimmed[9] === '3' || trimmed[9] === '4' || trimmed[9] === '5')) {
      const day = parseInt(trimmed.substring(10, 12), 10);
      const month = parseInt(trimmed.substring(12, 14), 10) - 1;
      const year = parseInt(trimmed.substring(14, 18), 10);
      const hour = parseInt(trimmed.substring(18, 20), 10);
      const minute = parseInt(trimmed.substring(20, 22), 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const d = new Date(Date.UTC(year, month, day, hour, minute, 0));
        const rawIdentifier = trimmed.length >= 34 ? trimmed.substring(22, 34) : trimmed.substring(22);
        const cleanReg = rawIdentifier.replace(/^0+/, '') || rawIdentifier;
        if (!isNaN(d.getTime()) && cleanReg) {
          return `${cleanReg.trim()};${d.toISOString()}`;
        }
      }
    }

    // 5. Fallback Regex para qualquer linha com data ISO e identificador
    const isoMatch = trimmed.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:?\d{2}|Z)?)/);
    if (isoMatch && isoMatch.index !== undefined) {
      const dateStr = isoMatch[1].replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const rest = trimmed.substring(isoMatch.index + isoMatch[1].length);
        const matchDigits = rest.match(/(\d{8,14})/);
        if (matchDigits) {
          return `${matchDigits[1]};${d.toISOString()}`;
        }
      }
    }

    return trimmed;
  };

  const handleUpload = async () => {
    if (!fileContent.trim()) {
      setError('Selecione um arquivo AFD válido');
      return;
    }

    const allLines = fileContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (allLines.length === 0) {
      setError('O arquivo selecionado está vazio');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Normaliza as linhas de dados para compatibilidade universal com a API
      const normalizedLines = allLines.map((l) => normalizeAfdLine(l)).filter(Boolean);

      // Identifica linha de cabeçalho (Tipo 1)
      const headerLine = normalizedLines.find((l) => l.length >= 10 && l[9] === '1') || '';
      // Linhas de dados (marcações)
      const dataLines = normalizedLines.filter((l) => !(l.length >= 10 && l[9] === '1'));

      const CHUNK_SIZE = 1500;
      const totalChunks = Math.max(1, Math.ceil(dataLines.length / CHUNK_SIZE));

      const aggregatedResult: SyncResult = {
        syncLogId: '',
        status: 'SUCCESS',
        totalRecords: 0,
        importedRecords: 0,
        ignoredRecords: 0,
        unmappedRecords: 0,
        errorCount: 0,
        durationMs: 0,
        message: '',
      };

      const startTime = Date.now();

      for (let i = 0; i < totalChunks; i++) {
        const chunkIndex = i + 1;
        const currentSlice = dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkContent = headerLine
          ? `${headerLine}\n${currentSlice.join('\n')}`
          : currentSlice.join('\n');

        const pct = Math.round((chunkIndex / totalChunks) * 100);
        setProgressPercent(pct);
        setProgressText(
          totalChunks > 1
            ? `Processando lote ${chunkIndex} de ${totalChunks} (${pct}%)...`
            : 'Processando arquivo AFD...'
        );

        const res = await integrationService.uploadAfd(
          integrationKey,
          chunkContent,
          selectedDeviceId || null
        );

        aggregatedResult.syncLogId = res.syncLogId;
        aggregatedResult.totalRecords += res.totalRecords;
        aggregatedResult.importedRecords += res.importedRecords;
        aggregatedResult.ignoredRecords += res.ignoredRecords;
        aggregatedResult.unmappedRecords += res.unmappedRecords;
        aggregatedResult.errorCount += res.errorCount;
        if (res.status === 'PARTIAL_SUCCESS' || res.status === 'FAILED') {
          aggregatedResult.status = res.status;
        }
      }

      aggregatedResult.durationMs = Date.now() - startTime;
      aggregatedResult.message = `Processamento concluído com sucesso: ${aggregatedResult.importedRecords} novas marcações salvas, ${aggregatedResult.ignoredRecords} já existentes.`;

      setResult(aggregatedResult);
      setProgressText('');
      setProgressPercent(100);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Falha ao processar arquivo AFD');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFileName('');
    setFileContent('');
    setLinesCount(0);
    setResult(null);
    setError(null);
    setProgressText('');
    setProgressPercent(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Arquivo AFD (Portarias 1510 & 671)"
      subtitle="Importe arquivos de fonte de dados oficiais extraídos via USB ou software do coletor"
      maxWidth="md"
      footer={
        result ? (
          <Button variant="primary" onClick={handleClose}>
            Concluir
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={loading || !fileContent}
              icon={<Upload className="w-4 h-4" />}
            >
              {loading ? (progressText || 'Processando...') : 'Processar e Importar'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {loading && progressPercent > 0 && (
          <div className="p-3 bg-atrio-teal-light/20 border border-atrio-teal/30 rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-semibold text-atrio-navy">
              <span>{progressText}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-atrio-teal h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Falha na Importação</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              {result.status === 'SUCCESS' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-atrio-text-primary">Arquivo Processado</h4>
                <p className="text-xs text-atrio-text-secondary">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Lidas</span>
                <span className="text-base font-bold text-atrio-text-primary">{result.totalRecords}</span>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Novas Salvas</span>
                <span className="text-base font-bold text-emerald-700">{result.importedRecords}</span>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-600 uppercase font-semibold block">Duplicadas</span>
                <span className="text-base font-bold text-slate-700">{result.ignoredRecords}</span>
              </div>
            </div>
          </div>
        )}

        {!result && (
          <>
            <div>
              <Select
                label="Vincular ao Relógio (Opcional)"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                options={[
                  { value: '', label: 'Identificar automaticamente pelo cabeçalho' },
                  ...devices.map((d) => ({
                    value: d.id,
                    label: `${d.name} (${d.serialNumber})`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Arquivo AFD / AFDR (.txt, .afd) <span className="text-rose-500">*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.afd"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-atrio-teal rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-atrio-teal-light/20 flex flex-col items-center justify-center gap-2"
              >
                {fileName ? (
                  <>
                    <FileText className="w-8 h-8 text-atrio-teal" />
                    <div>
                      <p className="text-sm font-bold text-atrio-text-primary truncate max-w-xs">{fileName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{linesCount} linhas detectadas</p>
                    </div>
                    <span className="text-xs text-atrio-teal font-semibold mt-1">Clique para trocar arquivo</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-8 h-8 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Clique para selecionar o arquivo</p>
                      <p className="text-xs text-slate-400 mt-0.5">Suporta formato AFD oficial Portaria 1510 / Portaria 671</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Normas & Padrões Suportados:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                <li>Portaria MTE 1.510/2009 (REP Convencional Tipo 3)</li>
                <li>Portaria MTP 671/2021 (REP-C, REP-A e REP-P)</li>
                <li>Arquivos exportados via Pen Drive nos relógios Control iD</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
