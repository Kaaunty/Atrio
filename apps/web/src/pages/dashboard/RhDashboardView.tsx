import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  Stethoscope,
  AlertOctagon,
  TrendingDown,
  Search,
  Clock,
  ChevronRight,
  Building2,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { api } from '../../services/api';

export interface DepartmentSimple {
  id: string;
  name: string;
}

export interface DepartmentStat {
  id: string;
  name: string;
  code: string;
  total: number;
  active: number;
  vacation: number;
  leave: number;
}

export const RhDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [departments, setDepartments] = useState<DepartmentSimple[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [deptSearch, setDeptSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Busca Global Universal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedDept) params.departmentId = selectedDept;

      const res = await api.get('/dashboard/rh/summary', { params });
      setData(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard do RH:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar departamentos:', err);
      }
    };

    fetchDepts();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [selectedDept]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      const res = await api.get('/search/global', { params: { q } });
      setSearchResults(res.data.data);
    } catch (err) {
      console.error('Erro na busca global:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredDepartmentBreakdown: DepartmentStat[] = (data?.departmentBreakdown || []).filter(
    (dept: DepartmentStat) =>
      dept.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      dept.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-atrio-teal border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-atrio-text-secondary">Carregando central de comando corporativo do RH...</p>
      </div>
    );
  }

  const statusCounts = data?.statusCounts || {
    total: data?.headcount || 0,
    active: data?.headcount || 0,
    vacation: 0,
    leave: 0,
  };

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas RH */}
      <div className="bg-gradient-to-r from-atrio-navy via-slate-900 to-atrio-navy-dark p-4 sm:p-6 rounded-xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-teal">
            Central de Comando RH &amp; Diretoria
          </span>
          <h2 className="text-xl font-bold mt-0.5">Indicadores Globais da Empresa</h2>
          <p className="text-xs text-slate-300 mt-1">
            Monitoramento de status de pessoal, distribuição por setor, férias, absenteísmo e controle operacional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900/90 text-white border-white/20 text-xs rounded-lg cursor-pointer focus:ring-atrio-teal"
            optionClassName="bg-slate-900 text-white"
            options={[
              { value: '', label: 'Todos os Setores' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      {/* Barra de Busca Universal Global */}
      <Card className="space-y-3 relative">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Busca Universal Global (Nome, Matrícula, CPF, Setor, Código de Solicitação)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-atrio-teal-dark" />}
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => handleSearch('')}>
              Limpar
            </Button>
          )}
        </div>

        {/* Dropdown de Resultados da Busca Universal */}
        {searchResults && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-atrio-border rounded-xl shadow-xl z-20 p-4 space-y-4 max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="text-center py-4 text-xs text-atrio-text-secondary">Buscando no sistema...</div>
            ) : (
              <>
                {searchResults.employees?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-atrio-teal-dark tracking-wider">
                      Colaboradores Encontrados ({searchResults.employees.length})
                    </span>
                    <div className="space-y-1">
                      {searchResults.employees.map((emp: any) => (
                        <div
                          key={emp.id}
                          onClick={() => navigate(`/colaboradores/${emp.id}`)}
                          className="p-2 rounded-lg hover:bg-atrio-teal-light/30 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-atrio-navy">{emp.name}</span>
                            <span className="text-atrio-text-secondary ml-2">({emp.department?.name || 'Sem Setor'})</span>
                          </div>
                          <span className="font-mono text-atrio-text-secondary">{emp.registrationNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.departments?.length > 0 && (
                  <div className="space-y-2 border-t border-atrio-border pt-2">
                    <span className="text-[10px] font-bold uppercase text-atrio-teal-dark tracking-wider">
                      Departamentos
                    </span>
                    <div className="space-y-1">
                      {searchResults.departments.map((dept: any) => (
                        <div
                          key={dept.id}
                          onClick={() => navigate('/organizacao')}
                          className="p-2 rounded-lg hover:bg-atrio-teal-light/30 cursor-pointer text-xs font-bold text-atrio-navy"
                        >
                          {dept.name} ({dept.code})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.requests?.length > 0 && (
                  <div className="space-y-2 border-t border-atrio-border pt-2">
                    <span className="text-[10px] font-bold uppercase text-atrio-teal-dark tracking-wider">
                      Solicitações
                    </span>
                    <div className="space-y-1">
                      {searchResults.requests.map((req: any) => (
                        <div
                          key={req.id}
                          onClick={() => navigate(`/solicitacoes/${req.id}`)}
                          className="p-2 rounded-lg hover:bg-atrio-teal-light/30 cursor-pointer flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-atrio-navy">{req.requestNumber}</span>
                            <span className="text-atrio-text-secondary ml-2">— {req.employeeName} ({req.typeName})</span>
                          </div>
                          <Badge variant="info" size="sm">{req.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.employees?.length === 0 &&
                  searchResults.departments?.length === 0 &&
                  searchResults.requests?.length === 0 && (
                    <div className="text-center py-4 text-xs text-atrio-text-secondary">
                      Nenhum resultado encontrado para &quot;{searchQuery}&quot;.
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Seção 1: Indicadores Principais de Status de Pessoal */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-atrio-navy" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-atrio-navy">
              Quadro de Colaboradores (Por Status)
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/colaboradores')}
            className="text-xs text-atrio-teal-dark hover:text-atrio-navy"
          >
            Gerenciar Colaboradores <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Cards de Status de Pessoal - Carrossel no Mobile / Grade no Desktop */}
        <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
          {/* Card 1: Total em Quadro */}
          <Card
            onClick={() => navigate('/colaboradores')}
            className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-atrio-navy hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
                Total em Quadro
              </span>
              <div className="p-2 bg-slate-100 text-atrio-navy rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-atrio-navy">
                {statusCounts.total}
              </span>
              <span className="text-[11px] font-semibold text-atrio-text-secondary">
                100% da equipe
              </span>
            </div>
            <p className="text-[11px] text-atrio-text-secondary">Todos os vínculos ativos no sistema</p>
          </Card>

          {/* Card 2: Ativos */}
          <Card
            onClick={() => navigate('/colaboradores')}
            className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Colaboradores Ativos
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600">
                {statusCounts.active}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {statusCounts.total > 0
                  ? `${Math.round((statusCounts.active / statusCounts.total) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-atrio-text-secondary">Trabalhando normalmente hoje</p>
          </Card>

          {/* Card 3: De Férias */}
          <Card
            onClick={() => navigate('/rh/ferias')}
            className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Em Férias
              </span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-purple-600">
                {statusCounts.vacation}
              </span>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                {statusCounts.total > 0
                  ? `${Math.round((statusCounts.vacation / statusCounts.total) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-atrio-text-secondary">Período de descanso regulamentar</p>
          </Card>

          {/* Card 4: Afastados */}
          <Card
            onClick={() => navigate('/colaboradores')}
            className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Afastados / Licença
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-600">
                {statusCounts.leave}
              </span>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                {statusCounts.total > 0
                  ? `${Math.round((statusCounts.leave / statusCounts.total) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-atrio-text-secondary">Saúde, INSS ou licenças especiais</p>
          </Card>
        </div>
      </div>

      {/* Seção 2: Distribuição de Colaboradores por Setor / Departamento */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-atrio-teal-dark" />
              <h3 className="text-sm font-bold text-atrio-navy">Distribuição do Quadro por Setor / Departamento</h3>
              <Badge variant="info" size="sm">
                {data?.departmentBreakdown?.length || 0} setores
              </Badge>
            </div>
            <p className="text-xs text-atrio-text-secondary mt-0.5">
              Acompanhamento de colaboradores ativos, de férias ou afastados agrupados por área da empresa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-full sm:w-56">
              <Input
                placeholder="Filtrar setores..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                leftIcon={<Filter className="w-3.5 h-3.5 text-atrio-text-secondary" />}
              />
            </div>
            {selectedDept && (
              <Button variant="secondary" size="sm" onClick={() => setSelectedDept('')}>
                Limpar Filtro
              </Button>
            )}
          </div>
        </div>

        {filteredDepartmentBreakdown.length === 0 ? (
          <div className="text-center py-8 text-xs text-atrio-text-secondary bg-atrio-border-light/30 rounded-xl border border-atrio-border/60">
            {deptSearch
              ? `Nenhum setor encontrado para "${deptSearch}".`
              : 'Nenhum departamento cadastrado ou sem colaboradores vinculados.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-atrio-border rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-atrio-border-light text-atrio-navy font-bold border-b border-atrio-border">
                <tr>
                  <th className="p-3">Setor / Departamento</th>
                  <th className="p-3">Código</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Ativos</th>
                  <th className="p-3 text-center">Em Férias</th>
                  <th className="p-3 text-center">Afastados</th>
                  <th className="p-3 min-w-[140px]">Proporção Visual</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border/60">
                {filteredDepartmentBreakdown.map((dept) => {
                  const activePct = dept.total > 0 ? (dept.active / dept.total) * 100 : 0;
                  const vacationPct = dept.total > 0 ? (dept.vacation / dept.total) * 100 : 0;
                  const leavePct = dept.total > 0 ? (dept.leave / dept.total) * 100 : 0;

                  return (
                    <tr
                      key={dept.id}
                      className={`hover:bg-atrio-border-light/40 transition-colors ${
                        selectedDept === dept.id ? 'bg-atrio-teal-light/20 font-medium' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-atrio-navy">{dept.name}</span>
                          {selectedDept === dept.id && (
                            <Badge variant="info" size="sm">Filtrado</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-atrio-text-secondary">{dept.code || '—'}</td>
                      <td className="p-3 text-center font-extrabold text-atrio-navy">
                        {dept.total}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {dept.active}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {dept.vacation > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {dept.vacation}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {dept.leave > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {dept.leave}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="p-3">
                        {dept.total > 0 ? (
                          <div className="w-full bg-slate-200 rounded-full h-2.5 flex overflow-hidden">
                            {activePct > 0 && (
                              <div
                                style={{ width: `${activePct}%` }}
                                className="bg-emerald-500 h-full"
                                title={`Ativos: ${dept.active} (${Math.round(activePct)}%)`}
                              />
                            )}
                            {vacationPct > 0 && (
                              <div
                                style={{ width: `${vacationPct}%` }}
                                className="bg-purple-500 h-full"
                                title={`Férias: ${dept.vacation} (${Math.round(vacationPct)}%)`}
                              />
                            )}
                            {leavePct > 0 && (
                              <div
                                style={{ width: `${leavePct}%` }}
                                className="bg-amber-500 h-full"
                                title={`Afastados: ${dept.leave} (${Math.round(leavePct)}%)`}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem membros</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {dept.id !== 'unassigned' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDept(selectedDept === dept.id ? '' : dept.id)}
                              className="text-[11px]"
                            >
                              {selectedDept === dept.id ? 'Ver Todos' : 'Filtrar'}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              navigate(
                                dept.id !== 'unassigned'
                                  ? `/colaboradores?departmentId=${dept.id}`
                                  : '/colaboradores'
                              )
                            }
                            className="text-[11px]"
                          >
                            Ver Colaboradores
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção 3: Cards de Indicadores Estratégicos RH - Carrossel no Mobile */}
      <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
        {/* Card 1: Turnover */}
        <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-semantic-info">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Taxa de Turnover (Mês)
            </span>
            <div className="p-2 bg-semantic-info-light text-semantic-info rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.turnoverRate || '0%'}
            </span>
            <span className="text-[11px] font-semibold text-semantic-success flex items-center">
              + {data?.admissionsMonth || 0} Admissões no mês
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">
            {data?.admissionsMonth || 0} Entradas / {data?.terminationsMonth || 0} Saídas
          </p>
        </Card>

        {/* Card 2: Férias com Risco de Vencimento */}
        <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-semantic-warning">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Férias a Vencer (&lt; 60d)
            </span>
            <div className="p-2 bg-semantic-warning-light text-semantic-warning rounded-lg">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-semantic-warning">
              {data?.expiringVacationsCount || 0}
            </span>
            {data?.expiringVacationsCount > 0 && <Badge variant="warning" size="sm">Risco de Dobro</Badge>}
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Períodos concessivos limite</p>
        </Card>

        {/* Card 3: Absenteísmo Estimado */}
        <Card className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start space-y-2 border-l-4 border-l-semantic-purple">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Taxa de Absenteísmo
            </span>
            <div className="p-2 bg-semantic-purple-light text-semantic-purple rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.absenteeismRate || '0%'}
            </span>
            <span className="text-[11px] font-semibold text-atrio-text-secondary">
              {data?.pendingDivergencesCount || 0} faltas registradas
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Faltas &amp; afastamentos do mês</p>
        </Card>
      </div>

      {/* Alerta de Férias a Vencer (< 60 Dias) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-atrio-navy">Férias com Risco de Vencimento (&lt; 60 Dias)</h3>
            <p className="text-xs text-atrio-text-secondary">
              Colaboradores cujo período concessivo expira em breve. Agende as férias para evitar pagamento em dobro.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/rh/ferias')}>
            Gestão de Férias RH <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {data?.expiringVacationsList?.length === 0 ? (
          <div className="text-center py-6 text-xs text-atrio-text-secondary">
            Nenhum período de férias com risco de vencimento nos próximos 60 dias.
          </div>
        ) : (
          <div className="overflow-x-auto border border-atrio-border rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-atrio-border-light text-atrio-navy font-bold border-b border-atrio-border">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Data Limite (Concessivo)</th>
                  <th className="p-3">Dias Disponíveis</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border/60">
                {data?.expiringVacationsList?.map((vac: any) => (
                  <tr key={vac.periodId} className="hover:bg-atrio-border-light/30">
                    <td className="p-3 font-bold text-atrio-text-primary">{vac.employeeName}</td>
                    <td className="p-3 font-mono text-atrio-text-secondary">{vac.registrationNumber}</td>
                    <td className="p-3 text-atrio-text-secondary">{vac.departmentName}</td>
                    <td className="p-3 font-mono text-semantic-warning font-bold">{vac.expirationDate}</td>
                    <td className="p-3 font-bold">{vac.availableDays} dias</td>
                    <td className="p-3 text-right">
                      <Button variant="secondary" size="sm" onClick={() => navigate('/rh/ferias')}>
                        Programar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Fila Geral de Solicitações do RH por SLA */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-atrio-navy">Fila de Solicitações da Central (Status por SLA)</h3>
        <div className="flex overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
          <div className="w-[42vw] xs:w-[150px] sm:w-auto shrink-0 snap-start p-4 rounded-xl bg-atrio-border-light/50 border border-atrio-border text-center space-y-1">
            <span className="text-xs text-atrio-text-secondary font-semibold uppercase">Abertas / Novas</span>
            <div className="text-2xl font-extrabold text-atrio-navy">{data?.requestsQueueSummary?.NOVA || 0}</div>
          </div>
          <div className="w-[42vw] xs:w-[150px] sm:w-auto shrink-0 snap-start p-4 rounded-xl bg-semantic-warning-light/40 border border-semantic-warning/30 text-center space-y-1">
            <span className="text-xs text-semantic-warning font-bold uppercase">Em Andamento</span>
            <div className="text-2xl font-extrabold text-semantic-warning">{data?.requestsQueueSummary?.EM_ANDAMENTO || 0}</div>
          </div>
          <div className="w-[42vw] xs:w-[150px] sm:w-auto shrink-0 snap-start p-4 rounded-xl bg-semantic-success-light/40 border border-semantic-success/30 text-center space-y-1">
            <span className="text-xs text-semantic-success font-bold uppercase">Concluídas</span>
            <div className="text-2xl font-extrabold text-semantic-success">{data?.requestsQueueSummary?.CONCLUIDA || 0}</div>
          </div>
          <div className="w-[42vw] xs:w-[150px] sm:w-auto shrink-0 snap-start p-4 rounded-xl bg-semantic-error-light/40 border border-semantic-error/30 text-center space-y-1">
            <span className="text-xs text-semantic-error font-bold uppercase">Rejeitadas</span>
            <div className="text-2xl font-extrabold text-semantic-error">{data?.requestsQueueSummary?.REJEITADA || 0}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

