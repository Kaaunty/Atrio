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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

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

  const handleUpload = async () => {
    if (!fileContent.trim()) {
      setError('Selecione um arquivo AFD válido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await integrationService.uploadAfd(
        integrationKey,
        fileContent,
        selectedDeviceId || null
      );

      setResult(res);
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
              {loading ? 'Processando...' : 'Processar e Importar'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
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
