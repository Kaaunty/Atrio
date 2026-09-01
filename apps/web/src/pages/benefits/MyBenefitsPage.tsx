import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  CreditCard,
  HeartHandshake,
  Shield,
  Utensils,
  Bus,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { api } from '../../services/api';

interface Dependent {
  name: string;
  relationship: string;
  birthDate?: string;
  cpf?: string;
}

interface BenefitItem {
  id: string;
  startDate: string;
  endDate?: string | null;
  cardNumberLast4?: string | null;
  monthlyValue: number;
  employeeDeductionValue: number;
  dependentsIncluded?: Dependent[] | null;
  status: 'ATIVO' | 'SUSPENSO' | 'CANCELADO';
  benefit: {
    id: string;
    name: string;
    provider: string;
    category: string;
    description?: string | null;
    deductionRule?: string | null;
  };
}

export const MyBenefitsPage: React.FC = () => {
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBenefits = async () => {
      try {
        setLoading(true);
        const res = await api.get('/benefits/me');
        setBenefits(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar meus benefícios:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyBenefits();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ALIMENTACAO':
        return <Utensils className="w-6 h-6 text-atrio-teal-dark" />;
      case 'TRANSPORTE':
        return <Bus className="w-6 h-6 text-semantic-info" />;
      case 'SAUDE':
        return <HeartHandshake className="w-6 h-6 text-rose-500" />;
      case 'ODONTOLOGICO':
        return <Shield className="w-6 h-6 text-emerald-500" />;
      case 'EDUCACAO':
        return <GraduationCap className="w-6 h-6 text-indigo-500" />;
      default:
        return <Sparkles className="w-6 h-6 text-atrio-navy" />;
    }
  };

  return (
    <AppLayout
      title="Meus Benefícios"
      subtitle="Consulte seus cartões, coberturas ativas e dependentes vinculados ao plano corporativo"
    >
      <div className="space-y-6">
        {/* Resumo no Topo - Carrossel no Mobile / Grade no Desktop */}
        <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
          <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 bg-gradient-to-br from-atrio-navy to-slate-900 text-white">
            <div className="p-3 rounded-2xl bg-white/10 text-atrio-teal border border-white/10">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium">Benefícios Ativos</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{benefits.length}</h3>
            </div>
          </Card>

          <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-atrio-teal-light text-atrio-teal-dark">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-atrio-text-secondary font-medium">Situação Geral</p>
              <h3 className="text-sm font-bold text-atrio-navy mt-0.5">Em Dia com RH</h3>
            </div>
          </Card>

          <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-semantic-info-light text-semantic-info">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-atrio-text-secondary font-medium">Dependentes Vinculados</p>
              <h3 className="text-2xl font-black text-atrio-navy mt-0.5">
                {benefits.reduce((acc, curr) => acc + (curr.dependentsIncluded?.length || 0), 0)}
              </h3>
            </div>
          </Card>
        </div>

        {/* Grade de Benefícios Ativos */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando seus benefícios...
          </div>
        ) : benefits.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum benefício ativo encontrado</h3>
            <p className="text-xs text-atrio-text-secondary max-w-md mx-auto">
              Você não possui benefícios cadastrados no momento. Entre em contato com a equipe de Recursos Humanos caso tenha dúvidas.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((item) => (
              <Card key={item.id} className="space-y-4 hover:shadow-md transition-shadow">
                {/* Cabeçalho do Benefício */}
                <div className="flex items-start justify-between border-b border-atrio-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-atrio-border-light border border-atrio-border">
                      {getCategoryIcon(item.benefit.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-atrio-navy">{item.benefit.name}</h3>
                      <p className="text-xs text-atrio-text-secondary">{item.benefit.provider}</p>
                    </div>
                  </div>
                  <Badge variant="success" dot size="sm">
                    {item.status}
                  </Badge>
                </div>

                {/* Descrição e Regras */}
                {item.benefit.description && (
                  <p className="text-xs text-atrio-text-secondary leading-relaxed bg-atrio-bg p-3 rounded-lg border border-atrio-border/60">
                    {item.benefit.description}
                  </p>
                )}

                {/* Detalhes de Valores e Cartão */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-atrio-border-light">
                    <span className="text-[10px] text-atrio-text-secondary font-medium block uppercase tracking-wider">
                      Valor Mensal
                    </span>
                    <span className="font-bold text-atrio-navy text-sm">
                      R$ {Number(item.monthlyValue).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-atrio-border-light">
                    <span className="text-[10px] text-atrio-text-secondary font-medium block uppercase tracking-wider">
                      Cartão (Final)
                    </span>
                    <span className="font-mono font-bold text-atrio-teal-dark text-sm">
                      {item.cardNumberLast4 ? `•••• ${item.cardNumberLast4}` : '—'}
                    </span>
                  </div>
                </div>

                {item.benefit.deductionRule && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <span className="font-semibold">Regra de Desconto:</span> {item.benefit.deductionRule}
                  </div>
                )}

                {/* Seção de Dependentes Cobertos */}
                {item.dependentsIncluded && item.dependentsIncluded.length > 0 && (
                  <div className="pt-3 border-t border-atrio-border/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-atrio-navy">
                      <Users className="w-3.5 h-3.5 text-atrio-teal-dark" />
                      <span>Dependentes Cobertos ({item.dependentsIncluded.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {item.dependentsIncluded.map((dep, dIdx) => (
                        <div
                          key={dIdx}
                          className="flex items-center justify-between text-xs bg-atrio-bg p-2 rounded-md border border-atrio-border/50"
                        >
                          <span className="font-medium text-atrio-navy">{dep.name}</span>
                          <span className="text-[11px] text-atrio-text-secondary bg-atrio-border-light px-2 py-0.5 rounded font-medium">
                            {dep.relationship}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Início de Vigência */}
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Vigência desde {new Date(item.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
