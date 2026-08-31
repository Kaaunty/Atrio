import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Briefcase, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronRight, 
  Info 
} from 'lucide-react';
import { 
  organizationService, 
  OrgChartCompany, 
  OrgChartDepartmentNode 
} from '../../services/organizationService';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';

export const OrgChartTab: React.FC = () => {
  const [chartData, setChartData] = useState<OrgChartCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<number>(100);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [selectedDeptDetails, setSelectedDeptDetails] = useState<OrgChartDepartmentNode | null>(null);

  const loadChart = async () => {
    try {
      setLoading(true);
      const data = await organizationService.getOrgChart();
      setChartData(data || []);
      if (data && data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar organograma:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
  }, []);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  const toggleCollapseNode = (nodeId: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleExpandAll = () => setCollapsedNodes({});

  const handleCollapseAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (nodes: OrgChartDepartmentNode[]) => {
      nodes.forEach((n) => {
        allIds[n.id] = true;
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    const activeComp = chartData.find((c) => c.id === selectedCompanyId);
    if (activeComp) traverse(activeComp.departmentsTree);
    setCollapsedNodes(allIds);
  };

  const activeCompany = chartData.find((c) => c.id === selectedCompanyId) || chartData[0];

  // Renderização Recursiva do Nó do Organograma
  const renderDepartmentNode = (node: OrgChartDepartmentNode) => {
    const isCollapsed = collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Card do Setor */}
        <div
          className="relative group bg-white border border-slate-200 hover:border-atrio-teal rounded-xl shadow-xs hover:shadow-md transition-all w-64 p-3.5 cursor-pointer z-10"
          onClick={() => setSelectedDeptDetails(node)}
        >
          {/* Barra de destaque superior Teal */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-atrio-teal rounded-t-xl" />

          <div className="flex items-start justify-between gap-2 mt-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-atrio-navy truncate">{node.name}</span>
                {node.code && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600 font-semibold">
                    {node.code}
                  </span>
                )}
              </div>
              {node.costCenter && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">CC: {node.costCenter}</p>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDeptDetails(node);
              }}
              className="text-slate-400 hover:text-atrio-teal p-1 rounded-md hover:bg-slate-50 transition-colors shrink-0"
              title="Detalhes do Setor"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Badges de Contagem */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-atrio-teal" />
              <strong>{node.positions.length}</strong> cargos
            </span>
            {hasChildren && (
              <span className="flex items-center gap-1 text-slate-400">
                <Layers className="w-3 h-3 text-slate-400" />
                <strong>{node.children.length}</strong> subsetores
              </span>
            )}
          </div>

          {/* Botão de Expandir/Recolher Branch */}
          {hasChildren && (
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapseNode(node.id);
              }}
            >
              <button className="w-6 h-6 rounded-full bg-white border border-slate-300 hover:border-atrio-teal shadow-xs flex items-center justify-center text-slate-600 hover:text-atrio-teal transition-colors">
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Linhas e Filhos (Se houver e não estiver colapsado) */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col items-center w-full">
            {/* Linha vertical descendo do pai */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Container dos nós filhos com linha horizontal conectora */}
            <div className="flex items-start justify-center relative pt-4">
              {/* Linha horizontal conectando os filhos */}
              {node.children.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-slate-300"
                  style={{
                    left: `calc(${100 / (node.children.length * 2)}%)`,
                    right: `calc(${100 / (node.children.length * 2)}%)`,
                  }}
                />
              )}

              {/* Ramo de cada filho */}
              <div className="flex items-start gap-8">
                {node.children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center relative">
                    {/* Linha vertical subindo para a linha horizontal */}
                    <div className="w-px h-4 bg-slate-300 absolute -top-4" />
                    {renderDepartmentNode(child)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Controles e Filtro */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-atrio-border shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              {chartData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName} ({c.departmentsCount} setores)
                </option>
              ))}
            </Select>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Badge variant="teal" size="sm">
              {activeCompany?.totalPositionsCount || 0} Cargos Totais
            </Badge>
            <Badge variant="neutral" size="sm">
              {activeCompany?.departmentsCount || 0} Setores
            </Badge>
          </div>
        </div>

        {/* Controles de Zoom e Expansão */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <div className="flex items-center rounded-lg border border-atrio-border bg-slate-50 p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 hover:text-atrio-navy hover:bg-white rounded transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-slate-600">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 hover:text-atrio-navy hover:bg-white rounded transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1.5 text-slate-600 hover:text-atrio-navy hover:bg-white rounded transition-colors ml-1 border-l border-slate-200"
              title="Resetar Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button variant="secondary" size="sm" icon={<Maximize2 className="w-3.5 h-3.5" />} onClick={handleExpandAll}>
            Expandir
          </Button>
          <Button variant="secondary" size="sm" icon={<Minimize2 className="w-3.5 h-3.5" />} onClick={handleCollapseAll}>
            Recolher
          </Button>
        </div>
      </div>

      {/* Canvas do Organograma Interativo */}
      <div className="bg-[#F8FAFC] border border-atrio-border rounded-xl shadow-inner min-h-[550px] p-8 overflow-auto flex items-start justify-center relative">
        {loading ? (
          <div className="my-auto text-center text-slate-400">
            Carregando estrutura do organograma...
          </div>
        ) : !activeCompany || activeCompany.departmentsTree.length === 0 ? (
          <div className="my-auto text-center space-y-3 max-w-sm">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhum setor cadastrado para esta empresa</h4>
            <p className="text-xs text-slate-500">
              Cadastre departamentos e cargos na aba "Setores" para gerar a árvore do organograma.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center transition-transform duration-150 origin-top"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {/* Nó Raiz da Empresa (Header Institucional) */}
            <div className="w-80 bg-atrio-navy-dark text-white rounded-xl shadow-md p-4 text-center border border-slate-800 mb-6 relative">
              <div className="w-8 h-8 rounded-lg bg-atrio-teal/20 text-atrio-teal mx-auto flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base leading-tight text-white">
                {activeCompany.tradeName}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">{activeCompany.legalName}</p>
              <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-atrio-teal font-medium">
                <span>{activeCompany.unitsCount} Unidades</span> •{' '}
                <span>{activeCompany.departmentsCount} Setores</span> •{' '}
                <span>{activeCompany.totalPositionsCount} Cargos</span>
              </div>
            </div>

            {/* Linha vertical ligando a Empresa aos setores raízes */}
            <div className="w-px h-6 bg-slate-300" />

            {/* Árvore de Setores */}
            <div className="flex items-start justify-center relative pt-4">
              {/* Linha horizontal para múltiplos setores raiz */}
              {activeCompany.departmentsTree.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-slate-300"
                  style={{
                    left: `calc(${100 / (activeCompany.departmentsTree.length * 2)}%)`,
                    right: `calc(${100 / (activeCompany.departmentsTree.length * 2)}%)`,
                  }}
                />
              )}

              <div className="flex items-start gap-10">
                {activeCompany.departmentsTree.map((rootNode) => (
                  <div key={rootNode.id} className="flex flex-col items-center relative">
                    <div className="w-px h-4 bg-slate-300 absolute -top-4" />
                    {renderDepartmentNode(rootNode)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Setor Clicado */}
      {selectedDeptDetails && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDeptDetails(null)}
          title={selectedDeptDetails.name}
          subtitle={`Detalhamento do Setor • ${selectedDeptDetails.code || 'Sem código'}`}
          footer={
            <Button variant="secondary" onClick={() => setSelectedDeptDetails(null)}>
              Fechar
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Centro de Custo:</span>
                <p className="font-semibold text-slate-800 font-mono">
                  {selectedDeptDetails.costCenter || 'Não definido'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Subsetores Diretos:</span>
                <p className="font-semibold text-slate-800">
                  {selectedDeptDetails.children.length}
                </p>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-atrio-teal" />
                Cargos Alocados Neste Setor ({selectedDeptDetails.positions.length})
              </h5>

              {selectedDeptDetails.positions.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-100">
                  Nenhum cargo vinculado diretamente a este setor.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedDeptDetails.positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <span className="font-semibold text-xs text-slate-800">{pos.title}</span>
                      <Badge variant="teal" size="sm">
                        {pos.level}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
