import React, { useState } from 'react';
import { AlertCircle, ArrowRight, KeyRound, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { completePasswordChange, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await completePasswordChange({ currentPassword, newPassword });
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível alterar sua senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-atrio-navy rounded-full blur-[140px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-atrio-teal rounded-full blur-[140px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Card className="p-7 bg-white/95 backdrop-blur-md shadow-2xl border-white/20 rounded-2xl space-y-5">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src="/logo-color.png"
                  alt="Átrio Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </div>
              <span className="text-xl font-black tracking-tight text-atrio-navy">ÁTRIO</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Defina sua senha</h1>
            <p className="text-xs text-slate-500">
              Este é o primeiro acesso de <span className="font-semibold text-slate-700">{user?.email}</span>. Crie uma senha própria para continuar.
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
              label="Senha temporária"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            />
            <Input
              label="Nova senha"
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
              helperText="Use pelo menos 6 caracteres e não repita a senha temporária."
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              disabled={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
