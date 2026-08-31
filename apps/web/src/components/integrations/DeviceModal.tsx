import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { TimeClockDeviceItem, integrationService } from '../../services/integrationService';
import { organizationService, Unit } from '../../services/organizationService';
import { Cpu, HardDrive, Network, AlertCircle } from 'lucide-react';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  device?: TimeClockDeviceItem | null;
  defaultIntegrationKey?: string;
}

export const DeviceModal: React.FC<DeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  device,
  defaultIntegrationKey = 'control_id',
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    model: 'iDClass REP-C',
    ipAddress: '',
    port: 80,
    unitId: '',
    apiEndpoint: '',
    username: '',
    password: '',
    active: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadUnits();
      if (device) {
        setFormData({
          name: device.name,
          serialNumber: device.serialNumber,
          model: device.model || 'iDClass REP-C',
          ipAddress: device.ipAddress || '',
          port: device.port || 80,
          unitId: device.unitId || '',
          apiEndpoint: device.apiEndpoint || '',
          username: device.authCredentials?.username || '',
          password: device.authCredentials?.password || '',
          active: device.active,
        });
      } else {
        setFormData({
          name: '',
          serialNumber: '',
          model: 'iDClass REP-C',
          ipAddress: '',
          port: 80,
          unitId: '',
          apiEndpoint: '',
          username: '',
          password: '',
          active: true,
        });
      }
      setError(null);
    }
  }, [isOpen, device]);

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);
      const data = await organizationService.getUnits();
      setUnits(data);
    } catch {
      // Unidades opcionais caso ocorra falha
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.serialNumber.trim()) {
      setError('Nome e Número de Série são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const authCredentials =
        formData.username || formData.password
          ? { username: formData.username, password: formData.password }
          : undefined;

      if (device) {
        await integrationService.updateDevice(device.id, {
          name: formData.name.trim(),
          serialNumber: formData.serialNumber.trim(),
          model: formData.model.trim(),
          ipAddress: formData.ipAddress.trim() || null,
          port: Number(formData.port) || 80,
          unitId: formData.unitId || null,
          apiEndpoint: formData.apiEndpoint.trim() || null,
          authCredentials,
          active: formData.active,
        });
      } else {
        await integrationService.createDevice({
          name: formData.name.trim(),
          serialNumber: formData.serialNumber.trim(),
          model: formData.model.trim(),
          ipAddress: formData.ipAddress.trim() || null,
          port: Number(formData.port) || 80,
          unitId: formData.unitId || null,
          integrationKey: defaultIntegrationKey,
          apiEndpoint: formData.apiEndpoint.trim() || null,
          authCredentials,
          active: formData.active,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Falha ao salvar relógio de ponto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={device ? 'Editar Relógio de Ponto' : 'Novo Relógio de Ponto Control iD'}
      subtitle="Cadastre as credenciais e parâmetros de rede do equipamento REP"
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : device ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome de Identificação"
              placeholder="Ex: Relógio Matriz - Portaria Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              leftIcon={<HardDrive className="w-4 h-4" />}
            />
          </div>

          <div>
            <Input
              label="Número de Série (REP)"
              placeholder="Ex: 00000000000000101"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              required
              helperText="Gravado na carcaça ou visor do REP"
              leftIcon={<Cpu className="w-4 h-4" />}
            />
          </div>

          <div>
            <Select
              label="Modelo do Equipamento"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              options={[
                { value: 'iDClass REP-C', label: 'Control iD iDClass (REP-C)' },
                { value: 'iDFit REP-C', label: 'Control iD iDFit (Portaria 671)' },
                { value: 'iDAccess Pro', label: 'Control iD iDAccess Pro' },
                { value: 'iDFace', label: 'Control iD iDFace (Reconhecimento Facial)' },
                { value: 'iDCloud', label: 'Control iD Nuvem (iDCloud / iDSecure)' },
                { value: 'AFD Genérico', label: 'Outro Coletor (AFD Portaria 1510)' },
              ]}
            />
          </div>

          <div>
            <Input
              label="Endereço IP Local"
              placeholder="Ex: 192.168.1.200"
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              helperText="IP estático na rede local da filial"
              leftIcon={<Network className="w-4 h-4" />}
            />
          </div>

          <div>
            <Input
              label="Porta HTTP"
              type="number"
              placeholder="80"
              value={String(formData.port)}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 80 })}
              helperText="Padrão: 80 ou 443"
            />
          </div>

          <div className="md:col-span-2">
            <Select
              label="Unidade / Filial Vinculada"
              value={formData.unitId}
              onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              options={[
                { value: '', label: 'Selecione uma filial (opcional)...' },
                ...units.map((u) => ({
                  value: u.id,
                  label: `${u.name} ${u.city ? `(${u.city})` : ''}`,
                })),
              ]}
              disabled={loadingUnits}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Endpoint API / URL de Nuvem (Opcional)"
              placeholder="https://idcloud.controlid.com.br/api/v1"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              helperText="Utilizado caso a integração seja via iDSecure Cloud ou Webservice externo"
            />
          </div>

          <div>
            <Input
              label="Usuário da API / Relógio"
              placeholder="admin"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div>
            <Input
              label="Senha da API / Chave Mestre"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeDevice"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 rounded text-atrio-teal focus:ring-atrio-teal/30 border-slate-300"
            />
            <label htmlFor="activeDevice" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Dispositivo Ativo e Habilitado para Sincronização
            </label>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Portaria 1510 & 671</span>
        </div>
      </form>
    </Modal>
  );
};
