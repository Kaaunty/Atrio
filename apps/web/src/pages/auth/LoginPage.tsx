import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      const requiresPasswordChange = await login({ email, password });
      navigate(requiresPasswordChange ? '/alterar-senha' : '/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Credenciais incorretas ou usuário inativo. Verifique os dados informados.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Card Principal */}
        <Card className="p-8 sm:p-10 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80">
          {/* Logo e Nome Oficial */}
          <div className="flex flex-col items-center text-center space-y-2 mb-8">
            <div className="w-14 h-14 flex items-center justify-center">
              <img
                src="/logo-color.png"
                alt="Átrio"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            <span className="text-2xl font-bold tracking-tight text-atrio-navy">
              Átrio
            </span>
            <p className="text-xs text-slate-500 font-medium">
              Entre com suas credenciais para acessar
            </p>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                E-mail
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Senha
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Opções Auxiliares */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-atrio-teal focus:ring-atrio-teal cursor-pointer"
                />
                <span className="text-xs text-slate-600">Lembrar e-mail</span>
              </label>

              <span className="text-xs text-slate-400">
                Esqueceu a senha? Contate o RH
              </span>
            </div>

            {/* Botão Entrar */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center bg-atrio-navy hover:bg-atrio-navy-dark text-white font-semibold py-2.5 mt-2 shadow-sm transition-all"
              disabled={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
