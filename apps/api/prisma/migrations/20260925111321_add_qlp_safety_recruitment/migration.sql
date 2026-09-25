-- CreateEnum
CREATE TYPE "LaborClassification" AS ENUM ('DIRETA', 'INDIRETA');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'ADMINISTRATIVO');

-- CreateEnum
CREATE TYPE "LifecycleProcessType" AS ENUM ('ONBOARDING', 'OFFBOARDING');

-- CreateEnum
CREATE TYPE "LifecycleProcessStatus" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "LifecycleTaskCategory" AS ENUM ('RH', 'TI', 'GESTOR', 'FACILITIES', 'COLABORADOR');

-- CreateEnum
CREATE TYPE "LifecycleTaskStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'BLOQUEADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('OBRIGATORIO_LEGAL', 'INSTITUCIONAL', 'TECNICO', 'LIDERANCA', 'OPCIONAL');

-- CreateEnum
CREATE TYPE "EmployeeTrainingStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('POSITIVO', 'DESENVOLVIMENTO', 'REUNIAO_1ON1', 'ALINHAMENTO');

-- CreateEnum
CREATE TYPE "FeedbackVisibility" AS ENUM ('PRIVATE_MANAGER_EMPLOYEE', 'MANAGER_ONLY', 'RH_ACCESSIBLE');

-- CreateEnum
CREATE TYPE "DevelopmentPlanStatus" AS ENUM ('RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DevelopmentGoalStatus" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "WorkforceRequestType" AS ENUM ('REPOSICAO', 'COBERTURA_AFASTAMENTO', 'AMPLIACAO');

-- CreateEnum
CREATE TYPE "WorkforceRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'ENCAMINHADO_RECRUTAMENTO');

-- CreateEnum
CREATE TYPE "PpeMovementType" AS ENUM ('ENTREGA', 'SUBSTITUICAO', 'DEVOLUCAO');

-- CreateEnum
CREATE TYPE "SafetyEventType" AS ENUM ('ACIDENTE', 'INCIDENTE', 'QUASE_ACIDENTE');

-- CreateEnum
CREATE TYPE "SafetyEventStatus" AS ENUM ('ABERTO', 'EM_INVESTIGACAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "CipaMemberRole" AS ENUM ('REPRESENTANTE_EMPREGADOR', 'REPRESENTANTE_EMPREGADO');

-- CreateEnum
CREATE TYPE "SafetyActivityType" AS ENUM ('SIPATMA', 'DDS');

-- CreateEnum
CREATE TYPE "SafetyDocumentType" AS ENUM ('PGR', 'PCMSO', 'LTCAT', 'OUTRO');

-- CreateEnum
CREATE TYPE "CorrectiveActionSource" AS ENUM ('ACCIDENT', 'INSPECTION');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "JobRequisitionStatus" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateEnum
CREATE TYPE "JobOpeningStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('TRIAGEM', 'ENTREVISTA', 'AVALIACAO', 'PARECER', 'APROVADO', 'REPROVADO');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "labor_classification" "LaborClassification",
ADD COLUMN     "shift_type" "ShiftType";

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "process_type" "LifecycleProcessType" NOT NULL,
    "department_id" TEXT,
    "default_tasks" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_processes" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "process_type" "LifecycleProcessType" NOT NULL,
    "template_id" TEXT,
    "status" "LifecycleProcessStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "target_date" DATE NOT NULL,
    "completed_at" TIMESTAMP(3),
    "initiated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_tasks" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "LifecycleTaskCategory" NOT NULL DEFAULT 'RH',
    "assigned_user_id" TEXT,
    "due_date" DATE NOT NULL,
    "status" "LifecycleTaskStatus" NOT NULL DEFAULT 'PENDENTE',
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TrainingCategory" NOT NULL DEFAULT 'INSTITUCIONAL',
    "validity_months" INTEGER,
    "workload_hours" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL DEFAULT 'Interno',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_trainings" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "training_id" TEXT NOT NULL,
    "status" "EmployeeTrainingStatus" NOT NULL DEFAULT 'PENDENTE',
    "started_at" DATE,
    "completed_at" DATE,
    "expires_at" DATE,
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL DEFAULT 'REUNIAO_1ON1',
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "action_items" JSONB,
    "visibility" "FeedbackVisibility" NOT NULL DEFAULT 'PRIVATE_MANAGER_EMPLOYEE',
    "feedback_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_plans" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "mentor_id" TEXT,
    "title" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL DEFAULT 2026,
    "status" "DevelopmentPlanStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_plan_goals" (
    "id" TEXT NOT NULL,
    "development_plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "target_date" DATE NOT NULL,
    "status" "DevelopmentGoalStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "action_steps" TEXT,
    "evidence_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_plan_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_parameters" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "position_id" TEXT,
    "shift_type" "ShiftType",
    "labor_classification" "LaborClassification" NOT NULL DEFAULT 'DIRETA',
    "min_quantity" INTEGER NOT NULL,
    "planned_quantity" INTEGER NOT NULL,
    "max_quantity" INTEGER NOT NULL,
    "allowed_contract_types" JSONB NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_requests" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "position_id" TEXT,
    "shift_type" "ShiftType",
    "request_type" "WorkforceRequestType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "WorkforceRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workforce_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ca" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_deliveries" (
    "id" TEXT NOT NULL,
    "ppe_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "movement_type" "PpeMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "delivery_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "return_date" DATE,
    "reason" TEXT,
    "signature_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppe_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workplace_accidents" (
    "id" TEXT NOT NULL,
    "department_id" TEXT,
    "employee_id" TEXT,
    "type" "SafetyEventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "investigation" TEXT,
    "corrective_actions_summary" TEXT,
    "cat_number" TEXT,
    "cat_issued_at" DATE,
    "status" "SafetyEventStatus" NOT NULL DEFAULT 'ABERTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workplace_accidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_inspections" (
    "id" TEXT NOT NULL,
    "department_id" TEXT,
    "inspector_id" TEXT NOT NULL,
    "inspection_date" DATE NOT NULL,
    "checklist" JSONB NOT NULL,
    "irregularities_found" TEXT,
    "responsible_id" TEXT,
    "status" "SafetyEventStatus" NOT NULL DEFAULT 'ABERTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipa_members" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role" "CipaMemberRole" NOT NULL,
    "term_start" DATE NOT NULL,
    "term_end" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cipa_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cipa_meetings" (
    "id" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "minutes" TEXT NOT NULL,
    "pending_actions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cipa_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_activities" (
    "id" TEXT NOT NULL,
    "type" "SafetyActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" TEXT,
    "activity_date" DATE NOT NULL,
    "topics" TEXT,
    "responsible_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_activity_participants" (
    "id" TEXT NOT NULL,
    "safety_activity_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "safety_activity_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_documents" (
    "id" TEXT NOT NULL,
    "type" "SafetyDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "source_type" "CorrectiveActionSource" NOT NULL,
    "accident_id" TEXT,
    "inspection_id" TEXT,
    "description" TEXT NOT NULL,
    "responsible_id" TEXT,
    "due_date" DATE NOT NULL,
    "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'PENDENTE',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "position_id" TEXT,
    "shift_type" "ShiftType",
    "requested_quantity" INTEGER NOT NULL,
    "contract_type" "ContractType" NOT NULL DEFAULT 'CLT',
    "justification" TEXT NOT NULL,
    "status" "JobRequisitionStatus" NOT NULL DEFAULT 'PENDENTE',
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "workforce_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_openings" (
    "id" TEXT NOT NULL,
    "job_requisition_id" TEXT,
    "title" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "activities" TEXT,
    "conditions" TEXT,
    "deadline" DATE,
    "status" "JobOpeningStatus" NOT NULL DEFAULT 'ABERTA',
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resume_url" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "job_opening_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'TRIAGEM',
    "notes" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_schedules" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "interviewers" JSONB,
    "location" TEXT,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_templates_process_type_idx" ON "checklist_templates"("process_type");

-- CreateIndex
CREATE INDEX "checklist_templates_department_id_idx" ON "checklist_templates"("department_id");

-- CreateIndex
CREATE INDEX "lifecycle_processes_employee_id_idx" ON "lifecycle_processes"("employee_id");

-- CreateIndex
CREATE INDEX "lifecycle_processes_process_type_idx" ON "lifecycle_processes"("process_type");

-- CreateIndex
CREATE INDEX "lifecycle_processes_status_idx" ON "lifecycle_processes"("status");

-- CreateIndex
CREATE INDEX "lifecycle_tasks_process_id_idx" ON "lifecycle_tasks"("process_id");

-- CreateIndex
CREATE INDEX "lifecycle_tasks_category_idx" ON "lifecycle_tasks"("category");

-- CreateIndex
CREATE INDEX "lifecycle_tasks_assigned_user_id_idx" ON "lifecycle_tasks"("assigned_user_id");

-- CreateIndex
CREATE INDEX "lifecycle_tasks_status_idx" ON "lifecycle_tasks"("status");

-- CreateIndex
CREATE INDEX "employee_trainings_employee_id_idx" ON "employee_trainings"("employee_id");

-- CreateIndex
CREATE INDEX "employee_trainings_training_id_idx" ON "employee_trainings"("training_id");

-- CreateIndex
CREATE INDEX "employee_trainings_status_idx" ON "employee_trainings"("status");

-- CreateIndex
CREATE INDEX "feedbacks_employee_id_idx" ON "feedbacks"("employee_id");

-- CreateIndex
CREATE INDEX "feedbacks_author_id_idx" ON "feedbacks"("author_id");

-- CreateIndex
CREATE INDEX "feedbacks_feedback_date_idx" ON "feedbacks"("feedback_date");

-- CreateIndex
CREATE INDEX "development_plans_employee_id_idx" ON "development_plans"("employee_id");

-- CreateIndex
CREATE INDEX "development_plans_mentor_id_idx" ON "development_plans"("mentor_id");

-- CreateIndex
CREATE INDEX "development_plan_goals_development_plan_id_idx" ON "development_plan_goals"("development_plan_id");

-- CreateIndex
CREATE INDEX "development_plan_goals_status_idx" ON "development_plan_goals"("status");

-- CreateIndex
CREATE INDEX "workforce_parameters_department_id_idx" ON "workforce_parameters"("department_id");

-- CreateIndex
CREATE INDEX "workforce_parameters_position_id_idx" ON "workforce_parameters"("position_id");

-- CreateIndex
CREATE INDEX "workforce_parameters_active_idx" ON "workforce_parameters"("active");

-- CreateIndex
CREATE INDEX "workforce_requests_department_id_idx" ON "workforce_requests"("department_id");

-- CreateIndex
CREATE INDEX "workforce_requests_status_idx" ON "workforce_requests"("status");

-- CreateIndex
CREATE INDEX "ppe_deliveries_ppe_id_idx" ON "ppe_deliveries"("ppe_id");

-- CreateIndex
CREATE INDEX "ppe_deliveries_employee_id_idx" ON "ppe_deliveries"("employee_id");

-- CreateIndex
CREATE INDEX "workplace_accidents_department_id_idx" ON "workplace_accidents"("department_id");

-- CreateIndex
CREATE INDEX "workplace_accidents_employee_id_idx" ON "workplace_accidents"("employee_id");

-- CreateIndex
CREATE INDEX "workplace_accidents_status_idx" ON "workplace_accidents"("status");

-- CreateIndex
CREATE INDEX "safety_inspections_department_id_idx" ON "safety_inspections"("department_id");

-- CreateIndex
CREATE INDEX "safety_inspections_status_idx" ON "safety_inspections"("status");

-- CreateIndex
CREATE INDEX "cipa_members_employee_id_idx" ON "cipa_members"("employee_id");

-- CreateIndex
CREATE INDEX "cipa_members_active_idx" ON "cipa_members"("active");

-- CreateIndex
CREATE INDEX "safety_activities_department_id_idx" ON "safety_activities"("department_id");

-- CreateIndex
CREATE INDEX "safety_activity_participants_employee_id_idx" ON "safety_activity_participants"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "safety_activity_participants_safety_activity_id_employee_id_key" ON "safety_activity_participants"("safety_activity_id", "employee_id");

-- CreateIndex
CREATE INDEX "safety_documents_type_idx" ON "safety_documents"("type");

-- CreateIndex
CREATE INDEX "corrective_actions_accident_id_idx" ON "corrective_actions"("accident_id");

-- CreateIndex
CREATE INDEX "corrective_actions_inspection_id_idx" ON "corrective_actions"("inspection_id");

-- CreateIndex
CREATE INDEX "corrective_actions_status_idx" ON "corrective_actions"("status");

-- CreateIndex
CREATE INDEX "job_requisitions_department_id_idx" ON "job_requisitions"("department_id");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE INDEX "job_openings_job_requisition_id_idx" ON "job_openings"("job_requisition_id");

-- CreateIndex
CREATE INDEX "job_openings_status_idx" ON "job_openings"("status");

-- CreateIndex
CREATE INDEX "candidates_email_idx" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "applications_job_opening_id_idx" ON "applications"("job_opening_id");

-- CreateIndex
CREATE INDEX "applications_candidate_id_idx" ON "applications"("candidate_id");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_opening_id_candidate_id_key" ON "applications"("job_opening_id", "candidate_id");

-- CreateIndex
CREATE INDEX "interview_schedules_application_id_idx" ON "interview_schedules"("application_id");

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_processes" ADD CONSTRAINT "lifecycle_processes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_processes" ADD CONSTRAINT "lifecycle_processes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_processes" ADD CONSTRAINT "lifecycle_processes_initiated_by_id_fkey" FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_tasks" ADD CONSTRAINT "lifecycle_tasks_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "lifecycle_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_tasks" ADD CONSTRAINT "lifecycle_tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_tasks" ADD CONSTRAINT "lifecycle_tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_trainings" ADD CONSTRAINT "employee_trainings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_trainings" ADD CONSTRAINT "employee_trainings_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_plan_goals" ADD CONSTRAINT "development_plan_goals_development_plan_id_fkey" FOREIGN KEY ("development_plan_id") REFERENCES "development_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_parameters" ADD CONSTRAINT "workforce_parameters_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_parameters" ADD CONSTRAINT "workforce_parameters_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_requests" ADD CONSTRAINT "workforce_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_requests" ADD CONSTRAINT "workforce_requests_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_requests" ADD CONSTRAINT "workforce_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_requests" ADD CONSTRAINT "workforce_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_deliveries" ADD CONSTRAINT "ppe_deliveries_ppe_id_fkey" FOREIGN KEY ("ppe_id") REFERENCES "ppes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_deliveries" ADD CONSTRAINT "ppe_deliveries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_accidents" ADD CONSTRAINT "workplace_accidents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workplace_accidents" ADD CONSTRAINT "workplace_accidents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_inspections" ADD CONSTRAINT "safety_inspections_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cipa_members" ADD CONSTRAINT "cipa_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_activities" ADD CONSTRAINT "safety_activities_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_activity_participants" ADD CONSTRAINT "safety_activity_participants_safety_activity_id_fkey" FOREIGN KEY ("safety_activity_id") REFERENCES "safety_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_activity_participants" ADD CONSTRAINT "safety_activity_participants_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_accident_id_fkey" FOREIGN KEY ("accident_id") REFERENCES "workplace_accidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "safety_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requisitions" ADD CONSTRAINT "job_requisitions_workforce_request_id_fkey" FOREIGN KEY ("workforce_request_id") REFERENCES "workforce_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_openings" ADD CONSTRAINT "job_openings_job_requisition_id_fkey" FOREIGN KEY ("job_requisition_id") REFERENCES "job_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
