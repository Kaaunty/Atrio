import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowUpRight, Building2, Briefcase } from 'lucide-react';
import { Employee } from '../../services/employeeService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EmployeeSubordinatesProps {
  subordinates: Employee[];
}

export const EmployeeSubordinates: React.FC<EmployeeSubordinatesProps> = ({ subordinates }) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return <Badge variant="success">Ativo</Badge>;
      case 'FERIAS':
        return <Badge variant="warning">Férias</Badge>;
      case 'AFASTADO':
        return <Badge variant="neutral">Afastado</Badge>;
      case 'DESLIGADO':
        return <Badge variant="danger">Desligado</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (!subordinates || subordinates.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-600">Nenhum colaborador liderado diretamente</p>
        <p className="text-xs text-slate-400 mt-1">
          Este profissional não possui subordinados diretos vinculados na estrutura hierárquica.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-atrio-border">
        <div>
          <h3 className="text-base font-bold text-atrio-text-primary">
            Equipe & Colaboradores Liderados
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total de {subordinates.length} liderado{subordinates.length > 1 ? 's' : ''} sob a gestão direta deste profissional
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subordinates.map((sub) => (
          <div
            key={sub.id}
            className="bg-white rounded-xl border border-atrio-border p-4 shadow-xs hover:border-atrio-teal/50 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shrink-0 group-hover:border-atrio-teal transition-colors">
                    {sub.avatarUrl ? (
                      <img src={sub.avatarUrl} alt={sub.name} className="w-full h-full object-cover" />
                    ) : (
                      sub.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-atrio-navy truncate group-hover:text-atrio-teal-dark transition-colors">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">Matrícula: {sub.registrationNumber}</p>
                  </div>
                </div>

                {getStatusBadge(sub.status)}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100/80 mb-3">
                <div className="flex items-center gap-1.5 truncate">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{sub.position?.title || 'Sem cargo definido'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sub.department?.name || 'Sem setor'}</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center text-xs"
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/colaboradores/${sub.id}`)}
            >
              Ver Ficha Completa
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
