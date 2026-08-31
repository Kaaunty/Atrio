-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('SELF', 'TEAM', 'DEPARTMENT', 'COMPANY', 'ALL');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('TIME_CLOCK', 'ACCESS_CONTROL', 'PAYROLL', 'ERP', 'BENEFITS', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CONFIGURING', 'ERROR');

-- CreateEnum
CREATE TYPE "TimeClockSource" AS ENUM ('CONTROL_ID_API', 'CONTROL_ID_AFD', 'DIMEP', 'SECULLUM', 'AHGORA', 'MANUAL_IMPORT', 'WEB_PORTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('CRON_SCHEDULE', 'MANUAL_TRIGGER', 'WEBHOOK', 'AFD_UPLOAD');

-- CreateEnum
CREATE TYPE "TimeDailySummaryStatus" AS ENUM ('OK', 'DIVERGENCIA', 'FOLGA', 'FERIADO', 'FERIAS', 'AFASTAMENTO', 'FALTA');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCLUSAO', 'ALTERACAO', 'EXCLUSAO_DUPLICADA', 'JUSTIFICATIVA_FALTA');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDENTE_GESTOR', 'PENDENTE_RH', 'APROVADO', 'REJEITADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('DIRECT_MANAGER', 'DEPARTMENT_HEAD', 'SPECIFIC_ROLE', 'SPECIFIC_USER');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('RASCUNHO', 'ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_GESTOR', 'AGUARDANDO_RH', 'APROVADO', 'REJEITADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "RequestHistoryAction" AS ENUM ('CRIADA', 'AVANCADA', 'APROVADA', 'REJEITADA', 'DEVOLVIDA', 'COMENTADA', 'CANCELADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "VacationPeriodStatus" AS ENUM ('EM_AQUISICAO', 'ADQUIRIDO', 'CONCLUIDO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "VacationRequestStatus" AS ENUM ('PENDENTE_GESTOR', 'PENDENTE_RH', 'APROVADO', 'REJEITADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "MedicalCertificateReasonCategory" AS ENUM ('CONSULTA', 'EXAME', 'DOENCA_ATE_15D', 'DOENCA_SUPERIOR_15D', 'ACIDENTE_TRABALHO', 'MATERNIDADE', 'ACOMPANHAMENTO_FAMILIAR', 'DOACAO_SANGUE', 'OUTROS');

-- CreateEnum
CREATE TYPE "MedicalCertificateStatus" AS ENUM ('ENVIADO', 'EM_ANALISE_RH', 'APROVADO', 'REJEITADO', 'SOLICITADO_CORRECAO');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ATESTADO_MEDICO', 'LICENCA_MATERNIDADE', 'LICENCA_PATERNIDADE', 'AUXILIO_DOENCA_INSS', 'ACIDENTE_TRABALHO_INSS', 'LICENCA_NAO_REMUNERADA', 'OUTRO');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE_EMPLOYEE_RH', 'DEPARTMENT', 'COMPANY_WIDE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('PONTO', 'FERIAS', 'SOLICITACAO', 'DOCUMENTO', 'COMUNICADO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "BenefitCategory" AS ENUM ('ALIMENTACAO', 'TRANSPORTE', 'SAUDE', 'ODONTOLOGICO', 'EDUCACAO', 'CONVENIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EmployeeBenefitStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('INSTITUCIONAL', 'CAMPANHA_RH', 'EVENTO', 'BENEFICIOS', 'IMPORTANTE');

-- CreateEnum
CREATE TYPE "AnnouncementTargetType" AS ENUM ('ALL', 'SPECIFIC_DEPARTMENTS', 'SPECIFIC_UNITS', 'SPECIFIC_ROLES');

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "employee_id" TEXT;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "employee_id" TEXT;

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_system_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "scope" "PermissionScope" NOT NULL DEFAULT 'SELF',

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL DEFAULT 'TIME_CLOCK',
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "settings" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_clock_devices" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT,
    "name" TEXT NOT NULL,
    "ip_address" TEXT,
    "port" INTEGER DEFAULT 80,
    "serial_number" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "unit_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "api_endpoint" TEXT,
    "auth_credentials" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "time_clock_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_clock_entries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT,
    "registration_number" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "device_id" TEXT,
    "source" "TimeClockSource" NOT NULL DEFAULT 'CONTROL_ID_API',
    "nsr" BIGINT,
    "raw_payload" JSONB,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_clock_sync_logs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT,
    "device_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "imported_records" INTEGER NOT NULL DEFAULT 0,
    "ignored_records" INTEGER NOT NULL DEFAULT 0,
    "unmapped_records" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "status" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "error_details" JSONB,
    "triggered_by" "SyncTrigger" NOT NULL DEFAULT 'MANUAL_TRIGGER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_clock_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weekly_hours" INTEGER NOT NULL DEFAULT 44,
    "tolerance_minutes" INTEGER NOT NULL DEFAULT 10,
    "lunch_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "flexible_interval" BOOLEAN NOT NULL DEFAULT true,
    "schedule_rules" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_daily_summaries" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expected_work_minutes" INTEGER NOT NULL DEFAULT 0,
    "actual_work_minutes" INTEGER NOT NULL DEFAULT 0,
    "balance_minutes" INTEGER NOT NULL DEFAULT 0,
    "extra_hours_minutes" INTEGER NOT NULL DEFAULT 0,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "absence_minutes" INTEGER NOT NULL DEFAULT 0,
    "entries" JSONB NOT NULL,
    "status" "TimeDailySummaryStatus" NOT NULL DEFAULT 'OK',
    "divergence_reasons" JSONB,
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_balances" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year_month" TEXT NOT NULL,
    "starting_balance_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_credits_minutes" INTEGER NOT NULL DEFAULT 0,
    "total_debits_minutes" INTEGER NOT NULL DEFAULT 0,
    "manual_adjustments_minutes" INTEGER NOT NULL DEFAULT 0,
    "closing_balance_minutes" INTEGER NOT NULL DEFAULT 0,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_clock_adjustments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "target_time" TEXT NOT NULL,
    "original_entry_id" TEXT,
    "original_timestamp" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "attachment_url" TEXT,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDENTE_GESTOR',
    "manager_id" TEXT,
    "manager_action_at" TIMESTAMP(3),
    "manager_notes" TEXT,
    "rh_user_id" TEXT,
    "rh_action_at" TIMESTAMP(3),
    "rh_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_clock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GERAL',
    "icon" TEXT DEFAULT 'FileText',
    "form_schema" JSONB,
    "allow_attachments" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_workflows" (
    "id" TEXT NOT NULL,
    "request_type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approver_type" "ApproverType" NOT NULL,
    "required_role_id" TEXT,
    "timeout_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "request_type_id" TEXT NOT NULL,
    "workflow_id" TEXT,
    "requester_id" TEXT NOT NULL,
    "current_step_order" INTEGER NOT NULL DEFAULT 1,
    "current_assignee_id" TEXT,
    "priority" "RequestPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "RequestStatus" NOT NULL DEFAULT 'ABERTO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "form_data" JSONB,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_histories" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" "RequestHistoryAction" NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "step_name" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_periods" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "vesting_start_date" DATE NOT NULL,
    "vesting_end_date" DATE NOT NULL,
    "deadline_date" DATE NOT NULL,
    "days_entitled" INTEGER NOT NULL DEFAULT 30,
    "days_taken" INTEGER NOT NULL DEFAULT 0,
    "days_scheduled" INTEGER NOT NULL DEFAULT 0,
    "days_remaining" INTEGER NOT NULL DEFAULT 30,
    "status" "VacationPeriodStatus" NOT NULL DEFAULT 'EM_AQUISICAO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_requests" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "vacation_period_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days_count" INTEGER NOT NULL,
    "sell_days_count" INTEGER NOT NULL DEFAULT 0,
    "advance_thirteenth" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "VacationRequestStatus" NOT NULL DEFAULT 'PENDENTE_GESTOR',
    "manager_id" TEXT,
    "manager_action_at" TIMESTAMP(3),
    "manager_notes" TEXT,
    "rh_user_id" TEXT,
    "rh_action_at" TIMESTAMP(3),
    "rh_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "days_count" INTEGER NOT NULL,
    "end_date" DATE NOT NULL,
    "issue_date" DATE NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "crm_number" TEXT NOT NULL,
    "cid_code" TEXT,
    "reason_category" "MedicalCertificateReasonCategory" NOT NULL DEFAULT 'DOENCA_ATE_15D',
    "notes" TEXT,
    "document_url" TEXT NOT NULL,
    "status" "MedicalCertificateStatus" NOT NULL DEFAULT 'ENVIADO',
    "rh_reviewer_id" TEXT,
    "rh_review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves_of_absence" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "medical_certificate_id" TEXT,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "return_date" DATE,
    "inss_referral" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_of_absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_institutional" BOOLEAN NOT NULL DEFAULT false,
    "requires_read_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "reference_month" INTEGER,
    "reference_year" INTEGER,
    "expiration_date" DATE,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE_EMPLOYEE_RH',
    "department_id" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_read_receipts" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "document_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "category" "NotificationCategory" NOT NULL DEFAULT 'SISTEMA',
    "action_url" TEXT,
    "read_at" TIMESTAMP(3),
    "sent_via_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" "BenefitCategory" NOT NULL DEFAULT 'ALIMENTACAO',
    "description" TEXT,
    "deduction_rule" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_benefits" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "benefit_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "card_number_last4" TEXT,
    "monthly_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "employee_deduction_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dependents_included" JSONB,
    "status" "EmployeeBenefitStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'INSTITUCIONAL',
    "cover_image_url" TEXT,
    "attachments" JSONB,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "requires_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "target_type" "AnnouncementTargetType" NOT NULL DEFAULT 'ALL',
    "target_ids" JSONB,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_views" (
    "id" TEXT NOT NULL,
    "announcement_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "announcement_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_key_key" ON "integration_configs"("key");

-- CreateIndex
CREATE INDEX "integration_configs_key_idx" ON "integration_configs"("key");

-- CreateIndex
CREATE INDEX "integration_configs_category_idx" ON "integration_configs"("category");

-- CreateIndex
CREATE INDEX "integration_configs_enabled_idx" ON "integration_configs"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "time_clock_devices_serial_number_key" ON "time_clock_devices"("serial_number");

-- CreateIndex
CREATE INDEX "time_clock_devices_unit_id_idx" ON "time_clock_devices"("unit_id");

-- CreateIndex
CREATE INDEX "time_clock_devices_integration_id_idx" ON "time_clock_devices"("integration_id");

-- CreateIndex
CREATE INDEX "time_clock_devices_serial_number_idx" ON "time_clock_devices"("serial_number");

-- CreateIndex
CREATE INDEX "time_clock_devices_active_idx" ON "time_clock_devices"("active");

-- CreateIndex
CREATE UNIQUE INDEX "time_clock_entries_hash_key" ON "time_clock_entries"("hash");

-- CreateIndex
CREATE INDEX "time_clock_entries_employee_id_idx" ON "time_clock_entries"("employee_id");

-- CreateIndex
CREATE INDEX "time_clock_entries_registration_number_idx" ON "time_clock_entries"("registration_number");

-- CreateIndex
CREATE INDEX "time_clock_entries_timestamp_idx" ON "time_clock_entries"("timestamp");

-- CreateIndex
CREATE INDEX "time_clock_entries_device_id_idx" ON "time_clock_entries"("device_id");

-- CreateIndex
CREATE INDEX "time_clock_entries_hash_idx" ON "time_clock_entries"("hash");

-- CreateIndex
CREATE INDEX "time_clock_sync_logs_integration_id_idx" ON "time_clock_sync_logs"("integration_id");

-- CreateIndex
CREATE INDEX "time_clock_sync_logs_device_id_idx" ON "time_clock_sync_logs"("device_id");

-- CreateIndex
CREATE INDEX "time_clock_sync_logs_status_idx" ON "time_clock_sync_logs"("status");

-- CreateIndex
CREATE INDEX "time_clock_sync_logs_started_at_idx" ON "time_clock_sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "work_schedules_active_idx" ON "work_schedules"("active");

-- CreateIndex
CREATE INDEX "time_daily_summaries_employee_id_idx" ON "time_daily_summaries"("employee_id");

-- CreateIndex
CREATE INDEX "time_daily_summaries_date_idx" ON "time_daily_summaries"("date");

-- CreateIndex
CREATE INDEX "time_daily_summaries_status_idx" ON "time_daily_summaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "time_daily_summaries_employee_id_date_key" ON "time_daily_summaries"("employee_id", "date");

-- CreateIndex
CREATE INDEX "time_balances_employee_id_idx" ON "time_balances"("employee_id");

-- CreateIndex
CREATE INDEX "time_balances_year_month_idx" ON "time_balances"("year_month");

-- CreateIndex
CREATE UNIQUE INDEX "time_balances_employee_id_year_month_key" ON "time_balances"("employee_id", "year_month");

-- CreateIndex
CREATE INDEX "time_clock_adjustments_employee_id_idx" ON "time_clock_adjustments"("employee_id");

-- CreateIndex
CREATE INDEX "time_clock_adjustments_date_idx" ON "time_clock_adjustments"("date");

-- CreateIndex
CREATE INDEX "time_clock_adjustments_status_idx" ON "time_clock_adjustments"("status");

-- CreateIndex
CREATE INDEX "time_clock_adjustments_manager_id_idx" ON "time_clock_adjustments"("manager_id");

-- CreateIndex
CREATE INDEX "time_clock_adjustments_rh_user_id_idx" ON "time_clock_adjustments"("rh_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_types_code_key" ON "request_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "request_workflow_steps_workflow_id_step_order_key" ON "request_workflow_steps"("workflow_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "requests_request_number_key" ON "requests"("request_number");

-- CreateIndex
CREATE INDEX "requests_request_number_idx" ON "requests"("request_number");

-- CreateIndex
CREATE INDEX "requests_requester_id_idx" ON "requests"("requester_id");

-- CreateIndex
CREATE INDEX "requests_request_type_id_idx" ON "requests"("request_type_id");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "requests_current_assignee_id_idx" ON "requests"("current_assignee_id");

-- CreateIndex
CREATE INDEX "request_histories_request_id_idx" ON "request_histories"("request_id");

-- CreateIndex
CREATE INDEX "request_attachments_request_id_idx" ON "request_attachments"("request_id");

-- CreateIndex
CREATE INDEX "vacation_periods_employee_id_idx" ON "vacation_periods"("employee_id");

-- CreateIndex
CREATE INDEX "vacation_periods_status_idx" ON "vacation_periods"("status");

-- CreateIndex
CREATE INDEX "vacation_periods_deadline_date_idx" ON "vacation_periods"("deadline_date");

-- CreateIndex
CREATE UNIQUE INDEX "vacation_periods_employee_id_vesting_start_date_key" ON "vacation_periods"("employee_id", "vesting_start_date");

-- CreateIndex
CREATE INDEX "vacation_requests_employee_id_idx" ON "vacation_requests"("employee_id");

-- CreateIndex
CREATE INDEX "vacation_requests_vacation_period_id_idx" ON "vacation_requests"("vacation_period_id");

-- CreateIndex
CREATE INDEX "vacation_requests_status_idx" ON "vacation_requests"("status");

-- CreateIndex
CREATE INDEX "vacation_requests_start_date_idx" ON "vacation_requests"("start_date");

-- CreateIndex
CREATE INDEX "vacation_requests_end_date_idx" ON "vacation_requests"("end_date");

-- CreateIndex
CREATE INDEX "vacation_requests_manager_id_idx" ON "vacation_requests"("manager_id");

-- CreateIndex
CREATE INDEX "vacation_requests_rh_user_id_idx" ON "vacation_requests"("rh_user_id");

-- CreateIndex
CREATE INDEX "medical_certificates_employee_id_idx" ON "medical_certificates"("employee_id");

-- CreateIndex
CREATE INDEX "medical_certificates_status_idx" ON "medical_certificates"("status");

-- CreateIndex
CREATE INDEX "medical_certificates_start_date_idx" ON "medical_certificates"("start_date");

-- CreateIndex
CREATE INDEX "medical_certificates_end_date_idx" ON "medical_certificates"("end_date");

-- CreateIndex
CREATE INDEX "medical_certificates_rh_reviewer_id_idx" ON "medical_certificates"("rh_reviewer_id");

-- CreateIndex
CREATE INDEX "leaves_of_absence_employee_id_idx" ON "leaves_of_absence"("employee_id");

-- CreateIndex
CREATE INDEX "leaves_of_absence_leave_type_idx" ON "leaves_of_absence"("leave_type");

-- CreateIndex
CREATE INDEX "leaves_of_absence_start_date_idx" ON "leaves_of_absence"("start_date");

-- CreateIndex
CREATE INDEX "leaves_of_absence_end_date_idx" ON "leaves_of_absence"("end_date");

-- CreateIndex
CREATE INDEX "leaves_of_absence_active_idx" ON "leaves_of_absence"("active");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_code_key" ON "document_types"("code");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_document_type_id_idx" ON "employee_documents"("document_type_id");

-- CreateIndex
CREATE INDEX "employee_documents_visibility_idx" ON "employee_documents"("visibility");

-- CreateIndex
CREATE INDEX "employee_documents_department_id_idx" ON "employee_documents"("department_id");

-- CreateIndex
CREATE INDEX "employee_documents_reference_year_reference_month_idx" ON "employee_documents"("reference_year", "reference_month");

-- CreateIndex
CREATE INDEX "document_read_receipts_document_id_idx" ON "document_read_receipts"("document_id");

-- CreateIndex
CREATE INDEX "document_read_receipts_employee_id_idx" ON "document_read_receipts"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_read_receipts_document_id_employee_id_key" ON "document_read_receipts"("document_id", "employee_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_at_idx" ON "notifications"("read_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "employee_benefits_employee_id_idx" ON "employee_benefits"("employee_id");

-- CreateIndex
CREATE INDEX "employee_benefits_benefit_id_idx" ON "employee_benefits"("benefit_id");

-- CreateIndex
CREATE INDEX "employee_benefits_status_idx" ON "employee_benefits"("status");

-- CreateIndex
CREATE INDEX "announcements_author_id_idx" ON "announcements"("author_id");

-- CreateIndex
CREATE INDEX "announcements_published_at_idx" ON "announcements"("published_at");

-- CreateIndex
CREATE INDEX "announcements_is_pinned_idx" ON "announcements"("is_pinned");

-- CreateIndex
CREATE INDEX "announcement_views_announcement_id_idx" ON "announcement_views"("announcement_id");

-- CreateIndex
CREATE INDEX "announcement_views_employee_id_idx" ON "announcement_views"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_views_announcement_id_employee_id_key" ON "announcement_views"("announcement_id", "employee_id");

-- CreateIndex
CREATE INDEX "audit_logs_employee_id_idx" ON "audit_logs"("employee_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "employees_work_schedule_id_idx" ON "employees"("work_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_work_schedule_id_fkey" FOREIGN KEY ("work_schedule_id") REFERENCES "work_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_devices" ADD CONSTRAINT "time_clock_devices_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_devices" ADD CONSTRAINT "time_clock_devices_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "time_clock_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_sync_logs" ADD CONSTRAINT "time_clock_sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_sync_logs" ADD CONSTRAINT "time_clock_sync_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "time_clock_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_daily_summaries" ADD CONSTRAINT "time_daily_summaries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_balances" ADD CONSTRAINT "time_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_adjustments" ADD CONSTRAINT "time_clock_adjustments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_adjustments" ADD CONSTRAINT "time_clock_adjustments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_adjustments" ADD CONSTRAINT "time_clock_adjustments_rh_user_id_fkey" FOREIGN KEY ("rh_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_clock_adjustments" ADD CONSTRAINT "time_clock_adjustments_original_entry_id_fkey" FOREIGN KEY ("original_entry_id") REFERENCES "time_clock_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflows" ADD CONSTRAINT "request_workflows_request_type_id_fkey" FOREIGN KEY ("request_type_id") REFERENCES "request_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflow_steps" ADD CONSTRAINT "request_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "request_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_workflow_steps" ADD CONSTRAINT "request_workflow_steps_required_role_id_fkey" FOREIGN KEY ("required_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_current_assignee_id_fkey" FOREIGN KEY ("current_assignee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_request_type_id_fkey" FOREIGN KEY ("request_type_id") REFERENCES "request_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "request_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_histories" ADD CONSTRAINT "request_histories_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_histories" ADD CONSTRAINT "request_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_vacation_period_id_fkey" FOREIGN KEY ("vacation_period_id") REFERENCES "vacation_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_rh_user_id_fkey" FOREIGN KEY ("rh_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_rh_reviewer_id_fkey" FOREIGN KEY ("rh_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves_of_absence" ADD CONSTRAINT "leaves_of_absence_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves_of_absence" ADD CONSTRAINT "leaves_of_absence_medical_certificate_id_fkey" FOREIGN KEY ("medical_certificate_id") REFERENCES "medical_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_read_receipts" ADD CONSTRAINT "document_read_receipts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_read_receipts" ADD CONSTRAINT "document_read_receipts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_benefits" ADD CONSTRAINT "employee_benefits_benefit_id_fkey" FOREIGN KEY ("benefit_id") REFERENCES "benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
