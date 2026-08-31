import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionScope } from '../../services/authService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AppLayout } from '../layout/AppLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  minScope?: PermissionScope;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  minScope,
  allowedRoles,
}) => {
  const { isAuthenticated, loading, hasPermission, hasRole, roles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-3 border-atrio-teal border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Validando credenciais de acesso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validação de Permissão Granular e Escopo
  if (requiredPermission && !hasPermission(requiredPermission, minScope)) {
    return (
      <AppLayout title="Acesso Restrito" subtitle="Controle de Permissões e Segurança">
        <div className="max-w-2xl mx-auto py-12">
          <Card className="p-8 text-center space-y-6 bg-white border-atrio-border shadow-sm rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-atrio-navy">Acesso Não Autorizado</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Seu perfil atual (<span className="font-semibold text-atrio-navy">{roles.join(', ') || 'COLABORADOR'}</span>) 
                não possui permissão suficiente para acessar este recurso ({requiredPermission}
                {minScope ? ` com escopo mínimo ${minScope}` : ''}).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono inline-block">
              Código de Recurso: {requiredPermission}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(-1)}
              >
                Voltar à Página Anterior
              </Button>
              <Button
                variant="primary"
                icon={<Home className="w-4 h-4" />}
                onClick={() => navigate('/')}
              >
                Ir para o Início
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Validação de Papel de Acesso (Role)
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <AppLayout title="Acesso Restrito" subtitle="Controle de Perfis">
        <div className="max-w-2xl mx-auto py-12">
          <Card className="p-8 text-center space-y-6 bg-white border-atrio-border shadow-sm rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-atrio-navy">Perfil Insuficiente</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Esta área é restrita a usuários com perfil{' '}
                <span className="font-semibold text-atrio-navy">{allowedRoles.join(' ou ')}</span>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(-1)}
              >
                Voltar à Página Anterior
              </Button>
              <Button
                variant="primary"
                icon={<Home className="w-4 h-4" />}
                onClick={() => navigate('/')}
              >
                Ir para o Início
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
};
