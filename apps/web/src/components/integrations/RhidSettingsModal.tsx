import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { integrationService } from '../../services/integrationService';
import { Cloud, CheckCircle2, XCircle, Loader2, ShieldCheck, Activity, Key, Mail, Globe } from 'lucide-react';

interface RhidSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const RhidSettingsModal: React.FC<RhidSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [hasStoredPassword, setHasStoredPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getRhidSettings();
      setEmail(data.email || '');
      setDomain(data.domain || '');
      setEnabled(data.enabled ?? true);
      setAutoSync(data.autoSync ?? true);
      setHasStoredPassword(data.hasPassword);
      setPassword('');
    } catch (err) {
      console.error('Falha ao carregar configurações RHiD:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!email) {
      alert('Informe o e-mail da conta RHiD antes de testar.');
      return;
    }
    if (!password && !hasStoredPassword) {
      alert('Informe a senha do RHiD antes de testar.');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await integrationService.testRhidConnection({
        email,
        password: password || undefined,
        domain: domain || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Erro ao conectar',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!email) {
      alert('Informe o e-mail da conta RHiD.');
      return;
    }

    try {
      setSaving(true);
      await integrationService.updateRhidSettings({
        email,
        password: password || undefined,
        domain,
        enabled,
        autoSync,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar configurações do RHiD');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuração de Acesso ao RHiD Cloud"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testing || saving || (!email && !password && !hasStoredPassword)}
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2 text-indigo-600" />
                Testar Conexão
              </>
            )}
          </Button>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || (!email && !hasStoredPassword && !password)}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start space-x-3">
            <Cloud className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-950 font-medium">
              <span className="font-bold block mb-1 text-indigo-900">Integração Direta com RHiD v2 (Control iD API Cloud)</span>
              A conexão com a nuvem permite sincronizar colaboradores com todos os relógios físicos cadastrados na conta, além de baixar apurações e registros de ponto em tempo real.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                E-mail da Conta RHiD *
              </label>
              <Input
                type="email"
                placeholder="ex: webmaster@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center">
                  <Key className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Senha do RHiD *
                </span>
                {hasStoredPassword && (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 inline text-emerald-600" />
                    Senha gravada com segurança
                  </span>
                )}
              </label>
              <Input
                type="password"
                placeholder={hasStoredPassword ? '•••••••••••• (deixe em branco para manter a atual)' : 'Digite a senha do RHiD'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center">
                <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Domínio Personalizado (Opcional)
              </label>
              <Input
                type="text"
                placeholder="ex: minha_empresa (opcional)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Habilitar Sincronização via RHiD Cloud
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Permite a comunicação bidirecional de colaboradores e espelho de ponto via API oficial.
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Sincronização Automática em Onboarding / Offboarding
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Cadastra novos funcionários no RHiD na admissão e bloqueia o acesso em desligamentos.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div
                    className={`font-bold text-sm ${
                      testResult.success ? 'text-emerald-900' : 'text-rose-900'
                    }`}
                  >
                    {testResult.message}
                  </div>

                  {testResult.success && testResult.data && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm">
                        <span className="text-slate-500 block font-medium">Operador / Conta:</span>
                        <span className="font-bold text-slate-900">
                          {testResult.data.operatorName || testResult.data.operatorEmail}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm">
                        <span className="text-slate-500 block font-medium">Domínio do Cliente:</span>
                        <span className="font-bold text-slate-900">
                          {testResult.data.customerDomain || 'Padrão'} (ID: {testResult.data.customerId})
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm">
                        <span className="text-slate-500 block font-medium">Colaboradores no RHiD:</span>
                        <span className="font-extrabold text-indigo-600">
                          {testResult.data.totalEmployeesInRhid || 0} cadastrados
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm">
                        <span className="text-slate-500 block font-medium">Limite Licenciado:</span>
                        <span className="font-bold text-slate-900">
                          {testResult.data.maxUsers || '300'} usuários
                        </span>
                      </div>
                    </div>
                  )}

                  {testResult.error && (
                    <div className="mt-1 text-xs text-rose-700 font-mono">
                      {testResult.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
