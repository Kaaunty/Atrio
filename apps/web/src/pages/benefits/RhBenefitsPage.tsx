import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Plus, CreditCard } from 'lucide-react';
import { api } from '../../services/api';

interface BenefitCatalogItem {
  id: string;
  name: string;
  provider: string;
  category: string;
  description?: string | null;
  deductionRule?: string | null;
  active: boolean;
  _count?: { employeeBenefits: number };
}

export const RhBenefitsPage: React.FC = () => {
  const [benefits, setBenefits] = useState<BenefitCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form de Novo Benefício
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('ALIMENTACAO');
  const [description, setDescription] = useState('');
  const [deductionRule, setDeductionRule] = useState('');

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await api.get('/benefits');
      setBenefits(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar catálogo de benefícios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/benefits', {
        name,
        provider,
        category,
        description: description || undefined,
        deductionRule: deductionRule || undefined,
        active: true,
      });

      setShowCreateModal(false);
      setName('');
      setProvider('');
      setDescription('');
      setDeductionRule('');
      fetchCatalog();
    } catch (err) {
      console.error('Erro ao cadastrar benefício:', err);
      alert('Erro ao cadastrar benefício.');
    }
  };

  return (
    <AppLayout
      title="Gestão de Benefícios Corporativos"
      subtitle="Cadastre operadoras, regras de desconto e acompanhe a adesão de colaboradores"
    >
      <div className="space-y-6">
        {/* Barra Superior de Ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-atrio-teal-dark" />
            <h2 className="text-base font-bold text-atrio-navy">Catálogo de Benefícios</h2>
          </div>

          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Benefício
          </Button>
        </div>

        {/* Modal de Cadastro */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Cadastrar Novo Benefício</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-atrio-navy"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBenefit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Nome do Benefício *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Vale Refeição Flash"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Operadora / Fornecedor *
                  </label>
                  <Input
                    required
                    placeholder="Ex: Flash Benefícios / Unimed"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Categoria *
                  </label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'ALIMENTACAO', label: 'Alimentação / Refeição' },
                      { value: 'TRANSPORTE', label: 'Vale Transporte' },
                      { value: 'SAUDE', label: 'Plano de Saúde' },
                      { value: 'ODONTOLOGICO', label: 'Plano Odontológico' },
                      { value: 'EDUCACAO', label: 'Auxílio Educação / Cursos' },
                      { value: 'CONVENIO', label: 'Convênio / Parceria' },
                      { value: 'OUTRO', label: 'Outro Benefício' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Descrição Detalhada
                  </label>
                  <Input
                    placeholder="Resumo das regras de uso e coberturas..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Regra de Desconto em Folha
                  </label>
                  <Input
                    placeholder="Ex: Desconto fixo de R$ 1,00 ou 6% do salário base..."
                    value={deductionRule}
                    onChange={(e) => setDeductionRule(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Salvar Benefício
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Tabela de Catálogo de Benefícios */}
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-atrio-text-secondary text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
              Carregando catálogo de benefícios...
            </div>
          ) : benefits.length === 0 ? (
            <div className="text-center py-12 text-atrio-text-secondary text-sm">
              Nenhum benefício cadastrado no catálogo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-atrio-navy text-white uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Benefício / Operadora</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Regra de Desconto</th>
                    <th className="p-3">Adesões Ativas</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-atrio-border">
                  {benefits.map((b) => (
                    <tr key={b.id} className="hover:bg-atrio-border-light/40 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-atrio-navy text-sm">{b.name}</p>
                        <p className="text-[11px] text-atrio-text-secondary">{b.provider}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[11px] font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                          {b.category}
                        </span>
                      </td>
                      <td className="p-3 text-atrio-text-secondary">{b.deductionRule || '—'}</td>
                      <td className="p-3 font-bold text-atrio-navy">
                        {b._count?.employeeBenefits || 0} colaboradores
                      </td>
                      <td className="p-3">
                        <Badge variant={b.active ? 'success' : 'danger'} dot size="sm">
                          {b.active ? 'Ativo no Catálogo' : 'Inativo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};
