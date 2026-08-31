import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { TimeClockDeviceItem, SyncResult, integrationService } from '../../services/integrationService';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Calendar } from 'lucide-react';

interface ManualSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  devices: TimeClockDeviceItem[];
  integrationKey?: string;
}

export const ManualSyncModal: React.FC<ManualSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  devices,
  integrationKey = 'control_id',
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await integrationService.triggerSync(integrationKey, {
        deviceId: selectedDeviceId || null,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      setResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Falha ao executar sincronização');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Disparar Sincronização Manual"
      subtitle="Coleta as marcações de ponto dos equipamentos Control iD e grava registros imutáveis"
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
              onClick={handleSync}
              disabled={loading}
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              {loading ? 'Sincronizando...' : 'Iniciar Sincronização'}
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
              <p className="font-semibold">Erro no Processamento</p>
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
                <h4 className="text-sm font-bold text-atrio-text-primary">
                  {result.status === 'SUCCESS' ? 'Sincronização Concluída' : 'Sincronização com Avisos'}
                </h4>
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

            {result.unmappedRecords > 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                ⚠️ {result.unmappedRecords} marcações foram salvas sem vínculo de colaborador (matrícula não encontrada
                no cadastro).
              </p>
            )}
          </div>
        )}

        {!result && (
          <>
            <div>
              <Select
                label="Selecionar Relógio de Ponto"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                options={[
                  { value: '', label: 'Todos os relógios ativos da integração' },
                  ...devices.map((d) => ({
                    value: d.id,
                    label: `${d.name} (${d.serialNumber}) - ${d.model}`,
                  })),
                ]}
                helperText="Deixe em branco para sincronizar todos os dispositivos cadastrados"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Data Inicial (Opcional)"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
              </div>
              <div>
                <Input
                  label="Data Final (Opcional)"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                Idempotência Garantida
              </p>
              <p className="text-blue-700 text-[11px]">
                Você pode executar a sincronização quantas vezes desejar. O sistema utiliza hashing SHA-256 para evitar
                marcações duplicadas.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
