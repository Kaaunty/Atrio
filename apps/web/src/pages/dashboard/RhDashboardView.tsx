import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertOctagon,
  TrendingDown,
  Search,
  Clock,
  ChevronRight,
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

export const RhDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [departments, setDepartments] = useState<DepartmentSimple[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-atrio-teal border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-atrio-text-secondary">Carregando central de comando corporativo do RH...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas RH */}
      <div className="bg-gradient-to-r from-atrio-navy via-slate-900 to-atrio-navy-dark p-6 rounded-xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-teal">
            Central de Comando RH &amp; Diretoria
          </span>
          <h2 className="text-xl font-bold mt-0.5">Indicadores Globais da Empresa</h2>
          <p className="text-xs text-slate-300 mt-1">
            Monitoramento de headcount, turnover, absenteísmo, risco de vencimento de férias e controle geral.
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

      {/* Cards de Indicadores Corporativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Headcount */}
        <Card className="space-y-2 border-l-4 border-l-atrio-teal">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Headcount Ativo
            </span>
            <div className="p-2 bg-atrio-teal-light text-atrio-teal-dark rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.headcount || 0}
            </span>
            <span className="text-[11px] font-semibold text-semantic-success flex items-center">
              + {data?.admissionsMonth || 0} Admissões no mês
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Quadro geral de pessoal</p>
        </Card>

        {/* Card 2: Turnover */}
        <Card className="space-y-2 border-l-4 border-l-semantic-info">
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
          </div>
          <p className="text-[11px] text-atrio-text-secondary">
            {data?.admissionsMonth || 0} Entradas / {data?.terminationsMonth || 0} Saídas
          </p>
        </Card>

        {/* Card 3: Férias com Risco de Vencimento */}
        <Card className="space-y-2 border-l-4 border-l-semantic-warning">
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

        {/* Card 4: Absenteísmo Estimado */}
        <Card className="space-y-2 border-l-4 border-l-semantic-purple">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-atrio-border-light/50 border border-atrio-border text-center space-y-1">
            <span className="text-xs text-atrio-text-secondary font-semibold uppercase">Abertas / Novas</span>
            <div className="text-2xl font-extrabold text-atrio-navy">{data?.requestsQueueSummary?.NOVA || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-semantic-warning-light/40 border border-semantic-warning/30 text-center space-y-1">
            <span className="text-xs text-semantic-warning font-bold uppercase">Em Andamento</span>
            <div className="text-2xl font-extrabold text-semantic-warning">{data?.requestsQueueSummary?.EM_ANDAMENTO || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-semantic-success-light/40 border border-semantic-success/30 text-center space-y-1">
            <span className="text-xs text-semantic-success font-bold uppercase">Concluídas</span>
            <div className="text-2xl font-extrabold text-semantic-success">{data?.requestsQueueSummary?.CONCLUIDA || 0}</div>
          </div>
          <div className="p-4 rounded-xl bg-semantic-error-light/40 border border-semantic-error/30 text-center space-y-1">
            <span className="text-xs text-semantic-error font-bold uppercase">Rejeitadas</span>
            <div className="text-2xl font-extrabold text-semantic-error">{data?.requestsQueueSummary?.REJEITADA || 0}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
