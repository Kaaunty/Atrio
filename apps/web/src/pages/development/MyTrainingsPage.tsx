import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  GraduationCap,
  Clock,
  Calendar,
  ExternalLink,
  Award,
} from 'lucide-react';
import { api } from '../../services/api';

interface EmployeeTrainingItem {
  id: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'VENCIDO';
  startedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  certificateUrl?: string | null;
  training: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    workloadHours: number;
    validityMonths?: number | null;
    provider: string;
  };
}

export const MyTrainingsPage: React.FC = () => {
  const [trainings, setTrainings] = useState<EmployeeTrainingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Upload Certificado
  const [selectedItem, setSelectedItem] = useState<EmployeeTrainingItem | null>(null);
  const [certificateUrl, setCertificateUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMyTrainings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trainings/me');
      setTrainings(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar treinamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTrainings();
  }, []);

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !certificateUrl) return;
    try {
      setSubmitting(true);
      await api.post(`/trainings/${selectedItem.id}/certificate`, { certificateUrl });
      setSelectedItem(null);
      setCertificateUrl('');
      fetchMyTrainings();
    } catch (err) {
      console.error('Erro ao registrar certificado:', err);
      alert('Erro ao enviar certificado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Trilha de Aprendizado & Treinamentos"
      subtitle="Seus treinamentos institucionais, técnicos e de conformidade legal com emissão e registro de certificados"
    >
      <div className="space-y-6">
        {/* Modal de Certificado */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md space-y-4 bg-white shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                <h3 className="font-bold text-sm text-atrio-navy">Enviar Certificado de Conclusão</h3>
                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-atrio-navy">
                  ✕
                </button>
              </div>

              <form onSubmit={handleUploadCertificate} className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-atrio-navy">{selectedItem.training.title}</p>
                  <p className="text-[11px] text-atrio-text-secondary">
                    Carga Horária: {selectedItem.training.workloadHours}h · Provedor: {selectedItem.training.provider}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-atrio-text-secondary mb-1">
                    Link do Certificado ou Comprovante (PDF/URL) *
                  </label>
                  <Input
                    required
                    placeholder="https://storage.atrio.com.br/certificados/meu_certificado.pdf"
                    value={certificateUrl}
                    onChange={(e) => setCertificateUrl(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-atrio-border">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedItem(null)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                    {submitting ? 'Registrando...' : 'Confirmar Conclusão'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Lista de Treinamentos */}
        {loading ? (
          <div className="text-center py-12 text-atrio-text-secondary text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-atrio-teal border-t-transparent rounded-full mx-auto mb-2" />
            Carregando treinamentos...
          </div>
        ) : trainings.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-atrio-navy">Nenhum treinamento atribuído</h3>
            <p className="text-xs text-atrio-text-secondary">
              Você está em dia com todas as capacitações e obrigações legais.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((item) => (
              <Card
                key={item.id}
                className={`space-y-4 border-l-4 transition-shadow hover:shadow-md ${
                  item.status === 'CONCLUIDO'
                    ? 'border-l-semantic-success'
                    : item.status === 'VENCIDO'
                    ? 'border-l-semantic-danger'
                    : 'border-l-atrio-teal'
                }`}
              >
                <div className="flex items-center justify-between border-b border-atrio-border pb-3">
                  <span className="font-mono text-[10px] font-bold uppercase text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                    {item.training.category}
                  </span>
                  <Badge
                    variant={
                      item.status === 'CONCLUIDO'
                        ? 'success'
                        : item.status === 'VENCIDO'
                        ? 'danger'
                        : 'warning'
                    }
                    dot
                    size="sm"
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-atrio-navy">{item.training.title}</h3>
                  {item.training.description && (
                    <p className="text-xs text-atrio-text-secondary leading-relaxed line-clamp-2">
                      {item.training.description}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-xs text-slate-500 bg-atrio-bg p-3 rounded-xl border border-atrio-border/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Carga Horária:
                    </span>
                    <strong className="text-atrio-navy font-bold">{item.training.workloadHours} horas</strong>
                  </div>
                  {item.training.validityMonths && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Validade:
                      </span>
                      <strong className="text-atrio-navy font-bold">{item.training.validityMonths} meses</strong>
                    </div>
                  )}
                  {item.completedAt && (
                    <div className="flex items-center justify-between text-semantic-success pt-1 border-t border-atrio-border/60">
                      <span>Concluído em:</span>
                      <strong>{new Date(item.completedAt).toLocaleDateString('pt-BR')}</strong>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-atrio-border flex items-center justify-between">
                  {item.status === 'CONCLUIDO' && item.certificateUrl ? (
                    <a
                      href={item.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-atrio-teal hover:underline"
                    >
                      <Award className="w-4 h-4" /> Ver Certificado <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  ) : item.status !== 'CONCLUIDO' ? (
                    <Button variant="secondary" size="sm" onClick={() => setSelectedItem(item)}>
                      Enviar Certificado
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
