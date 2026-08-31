import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Building2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Credenciais incorretas ou usuário inativo. Verifique os dados informados.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-atrio-navy rounded-full blur-[140px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-atrio-teal rounded-full blur-[140px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-atrio-navy to-atrio-teal text-white shadow-xl shadow-atrio-teal/10 mb-2 border border-white/10">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ÁTRIO</h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-atrio-teal">
            Recursos Humanos Digital
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-7 bg-white/95 backdrop-blur-md shadow-2xl border-white/20 rounded-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-atrio-navy">Entrar no Sistema</h2>
            <p className="text-xs text-slate-500">
              Digite seu e-mail e senha cadastrados para acessar seu painel
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="seu.email@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            />

            <div className="space-y-1">
              <div className="relative">
                <Input
                  label="Senha de Acesso"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md bg-atrio-navy hover:bg-atrio-navy-dark text-white font-semibold py-2.5"
              disabled={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Autenticando...' : 'Acessar Sistema'}
            </Button>
          </form>

          {/* Atalhos Rápidos para Demonstração / Testes */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Acesso Rápido para Demonstração (Demo)
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@atrio.com.br', 'Atrio@2026')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] truncate">Admin Geral</p>
                  <p className="text-[10px] text-slate-400">Escopo Total</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('rh@atrio.com.br', 'Atrio@2026')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded bg-teal-100 text-atrio-navy flex items-center justify-center font-bold text-[10px] shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] truncate">Operador RH</p>
                  <p className="text-[10px] text-slate-400">Escopo Empresa</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('gestor@atrio.com.br', 'Atrio@2026')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] truncate">Gestor Líder</p>
                  <p className="text-[10px] text-slate-400">Escopo Equipe</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('colaborador@atrio.com.br', 'Atrio@2026')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-left transition-colors flex items-center gap-2 group"
              >
                <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] truncate">Colaborador</p>
                  <p className="text-[10px] text-slate-400">Autosserviço</p>
                </div>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          Átrio Gestão & Soluções • Protegido por criptografia e em conformidade com a LGPD
        </p>
      </div>
    </div>
  );
};
