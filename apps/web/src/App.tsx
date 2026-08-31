import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { HomePage } from './pages/HomePage';
import { OrganizationPage } from './pages/organization/OrganizationPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { EmployeeDetailPage } from './pages/employees/EmployeeDetailPage';
import { AccessControlPage } from './pages/admin/AccessControlPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { IntegrationsHubPage } from './pages/integrations/IntegrationsHubPage';
import { ControlIdPage } from './pages/integrations/ControlIdPage';
import { MyTimeClockPage } from './pages/time-clock/MyTimeClockPage';
import { TeamTimeClockPage } from './pages/time-clock/TeamTimeClockPage';
import { WorkSchedulesPage } from './pages/time-clock/WorkSchedulesPage';
import { ManagerAdjustmentsPage } from './pages/time-clock/ManagerAdjustmentsPage';
import { RhAdjustmentsPage } from './pages/time-clock/RhAdjustmentsPage';
import { RequestsPage } from './pages/requests/RequestsPage';
import { RequestDetailPage } from './pages/requests/RequestDetailPage';
import { MyVacationsPage } from './pages/vacations/MyVacationsPage';
import { TeamVacationsCalendarPage } from './pages/vacations/TeamVacationsCalendarPage';
import { RhVacationsPage } from './pages/vacations/RhVacationsPage';
import { SubmitCertificatePage } from './pages/time-clock/SubmitCertificatePage';
import { RhMedicalCertificatesPage } from './pages/medical-certificates/RhMedicalCertificatesPage';
import { TeamAbsencesPage } from './pages/management/TeamAbsencesPage';
import { MyDocumentsPage } from './pages/documents/MyDocumentsPage';
import { RhDocumentsPage } from './pages/documents/RhDocumentsPage';
import { RhReportsPage } from './pages/reports/RhReportsPage';
import { MyBenefitsPage } from './pages/benefits/MyBenefitsPage';
import { RhBenefitsPage } from './pages/benefits/RhBenefitsPage';
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage';
import { AnnouncementDetailPage } from './pages/announcements/AnnouncementDetailPage';
import { RhNewAnnouncementPage } from './pages/announcements/RhNewAnnouncementPage';
import { RhLifecycleProcessesPage } from './pages/lifecycle/RhLifecycleProcessesPage';
import { LifecycleProcessDetailPage } from './pages/lifecycle/LifecycleProcessDetailPage';
import { MyPendingTasksPage } from './pages/lifecycle/MyPendingTasksPage';
import { MyTrainingsPage } from './pages/development/MyTrainingsPage';
import { RhTrainingsPage } from './pages/development/RhTrainingsPage';
import { FeedbacksPage } from './pages/development/FeedbacksPage';
import { DevelopmentPlanPage } from './pages/development/DevelopmentPlanPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Pública de Autenticação */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas de Autosserviço / Meu Espaço */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentos"
            element={
              <ProtectedRoute requiredPermission="documentos.visualizar" minScope="SELF">
                <MyDocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitacoes"
            element={
              <ProtectedRoute requiredPermission="solicitacoes.abrir" minScope="SELF">
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitacoes/:id"
            element={
              <ProtectedRoute requiredPermission="solicitacoes.abrir" minScope="SELF">
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ponto/meu-ponto"
            element={
              <ProtectedRoute requiredPermission="ponto.visualizar" minScope="SELF">
                <MyTimeClockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ponto/enviar-atestado"
            element={
              <ProtectedRoute requiredPermission="atestados.enviar" minScope="SELF">
                <SubmitCertificatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ferias/minhas-ferias"
            element={
              <ProtectedRoute requiredPermission="ferias.visualizar" minScope="SELF">
                <MyVacationsPage />
              </ProtectedRoute>
            }
          />

          {/* Rotas de Gestão & Liderança de Equipe */}
          <Route
            path="/gestao/equipe/ponto"
            element={
              <ProtectedRoute requiredPermission="ponto.visualizar" minScope="TEAM">
                <TeamTimeClockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao/equipe/ausencias"
            element={
              <ProtectedRoute requiredPermission="afastamentos.visualizar" minScope="TEAM">
                <TeamAbsencesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao/aprovacoes/ponto"
            element={
              <ProtectedRoute requiredPermission="ponto.aprovar" minScope="TEAM">
                <ManagerAdjustmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao/ferias/calendario"
            element={
              <ProtectedRoute requiredPermission="ferias.aprovar" minScope="TEAM">
                <TeamVacationsCalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Rotas de Gestão RH & Estrutura */}
          <Route
            path="/rh/ponto/ajustes"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhAdjustmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/atestados"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhMedicalCertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/ferias"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhVacationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/documentos/gestao"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhDocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/relatorios"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'GESTOR']}>
                <RhReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/beneficios/meus-beneficios"
            element={
              <ProtectedRoute>
                <MyBenefitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/beneficios"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhBenefitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunicados"
            element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comunicados/:id"
            element={
              <ProtectedRoute>
                <AnnouncementDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/comunicados/novo"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhNewAnnouncementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/processos"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'GESTOR']}>
                <RhLifecycleProcessesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/processos/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH', 'GESTOR']}>
                <LifecycleProcessDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/processos/minhas-tarefas"
            element={
              <ProtectedRoute>
                <MyPendingTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/desenvolvimento/treinamentos"
            element={
              <ProtectedRoute>
                <MyTrainingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rh/treinamentos"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'RH']}>
                <RhTrainingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/desenvolvimento/feedbacks"
            element={
              <ProtectedRoute>
                <FeedbacksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/desenvolvimento/pdi"
            element={
              <ProtectedRoute>
                <DevelopmentPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizacao/escalas"
            element={
              <ProtectedRoute requiredPermission="organizacao.gerenciar" minScope="COMPANY">
                <WorkSchedulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizacao/*"
            element={
              <ProtectedRoute requiredPermission="organizacao.gerenciar" minScope="COMPANY">
                <OrganizationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/colaboradores"
            element={
              <ProtectedRoute requiredPermission="colaboradores.visualizar" minScope="TEAM">
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/colaboradores/:id"
            element={
              <ProtectedRoute requiredPermission="colaboradores.visualizar" minScope="TEAM">
                <EmployeeDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Rotas de Administração & Segurança */}
          <Route
            path="/admin/integracoes"
            element={
              <ProtectedRoute requiredPermission="integracoes.visualizar" minScope="COMPANY">
                <IntegrationsHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/integracoes/control-id"
            element={
              <ProtectedRoute requiredPermission="integracoes.gerenciar" minScope="COMPANY">
                <ControlIdPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/permissoes"
            element={
              <ProtectedRoute requiredPermission="admin.rbac.gerenciar" minScope="ALL">
                <AccessControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rbac"
            element={
              <ProtectedRoute requiredPermission="admin.rbac.gerenciar" minScope="ALL">
                <AccessControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/auditoria"
            element={
              <ProtectedRoute requiredPermission="admin.auditoria.visualizar" minScope="COMPANY">
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          {/* Fallback para rotas não encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
