import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Briefcase, 
  FolderTree 
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Tabs, TabItem } from '../../components/ui/Tabs';
import { CompaniesTab } from './CompaniesTab';
import { DepartmentsTab } from './DepartmentsTab';
import { PositionsTab } from './PositionsTab';
import { OrgChartTab } from './OrgChartTab';
import { organizationService } from '../../services/organizationService';

export const OrganizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('departments');
  const [stats, setStats] = useState({
    companies: 0,
    units: 0,
    departments: 0,
    positions: 0,
  });

  const loadStats = async () => {
    try {
      const [comps, unts, depts, pos] = await Promise.all([
        organizationService.getCompanies(),
        organizationService.getUnits(),
        organizationService.getDepartments(),
        organizationService.getPositions(),
      ]);

      setStats({
        companies: comps.data?.length || 0,
        units: unts?.length || 0,
        departments: depts?.length || 0,
        positions: pos.meta?.total ?? (pos.data?.length || 0),
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const tabs: TabItem[] = [
    {
      id: 'departments',
      label: 'Setores & Hierarquia',
      icon: <Layers className="w-4 h-4" />,
      badge: stats.departments,
    },
    {
      id: 'chart',
      label: 'Organograma Interativo',
      icon: <FolderTree className="w-4 h-4" />,
    },
    {
      id: 'positions',
      label: 'Cargos & Funções',
      icon: <Briefcase className="w-4 h-4" />,
      badge: stats.positions,
    },
    {
      id: 'companies',
      label: 'Empresas & Unidades',
      icon: <Building2 className="w-4 h-4" />,
      badge: stats.companies,
    },
  ];

  return (
    <AppLayout
      title="Estrutura Organizacional"
      subtitle="Gerencie empresas, unidades operacionais, departamentos e cargos com organograma integrado"
    >
      {/* Cards de Métricas Topo - Carrossel no Mobile / Grade no Desktop */}
      <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
        <Card className="w-[68vw] xs:w-[220px] sm:w-auto shrink-0 snap-start p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-atrio-navy flex items-center justify-center font-bold shrink-0 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Empresas Cadastradas</p>
            <h4 className="text-xl font-bold text-atrio-navy">{stats.companies}</h4>
          </div>
        </Card>

        <Card className="w-[68vw] xs:w-[220px] sm:w-auto shrink-0 snap-start p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Unidades Físicas</p>
            <h4 className="text-xl font-bold text-emerald-700">{stats.units}</h4>
          </div>
        </Card>

        <Card className="w-[68vw] xs:w-[220px] sm:w-auto shrink-0 snap-start p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-atrio-teal-dark flex items-center justify-center font-bold shrink-0 border border-teal-100">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Setores / Departamentos</p>
            <h4 className="text-xl font-bold text-atrio-teal-dark">{stats.departments}</h4>
          </div>
        </Card>

        <Card className="w-[68vw] xs:w-[220px] sm:w-auto shrink-0 snap-start p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Cargos & Funções</p>
            <h4 className="text-xl font-bold text-purple-700">{stats.positions}</h4>
          </div>
        </Card>
      </div>

      {/* Navegação por Abas */}
      <div className="space-y-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Conteúdo Dinâmico da Aba Selecionada */}
        <div>
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'chart' && <OrgChartTab />}
          {activeTab === 'positions' && <PositionsTab />}
          {activeTab === 'companies' && <CompaniesTab />}
        </div>
      </div>
    </AppLayout>
  );
};
