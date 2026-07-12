-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('string', 'number', 'boolean', 'json');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET');

-- CreateEnum
CREATE TYPE "XpEntryType" AS ENUM ('EARN', 'REDEEM', 'ADJUST');

-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('CSR', 'CHALLENGE', 'REDEMPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "CalculationMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "AwardMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT', 'TRANSITION', 'REDEEM', 'EXPORT', 'CONFIG_CHANGE');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'XLSX', 'CSV');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('Queued', 'Ready', 'Failed');

-- CreateEnum
CREATE TYPE "MetricDirection" AS ENUM ('higher_better', 'lower_better');

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('CSR_PARTICIPATION', 'CHALLENGE_PARTICIPATION');

-- CreateEnum
CREATE TYPE "ApprovalScope" AS ENUM ('ANY', 'SAME_DEPARTMENT');

-- CreateEnum
CREATE TYPE "RecipientStrategy" AS ENUM ('ACTOR', 'OWNER', 'ROLE', 'DEPARTMENT_HEAD', 'ALL_AFFECTED');

-- CreateEnum
CREATE TYPE "PolicyAudience" AS ENUM ('ALL', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "ScoringPillar" AS ENUM ('E', 'S', 'G');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "employee_code" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "designation" TEXT,
    "join_date" DATE,
    "avatar_key" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "value_type" "SettingValueType" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "lookup_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_values" (
    "id" UUID NOT NULL,
    "lookup_type_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_transitions" (
    "id" UUID NOT NULL,
    "lookup_type_id" UUID NOT NULL,
    "from_value_id" UUID NOT NULL,
    "to_value_id" UUID NOT NULL,
    "allowed_permission" TEXT,

    CONSTRAINT "lookup_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_weight_configs" (
    "id" UUID NOT NULL,
    "environmental_weight" INTEGER NOT NULL,
    "social_weight" INTEGER NOT NULL,
    "governance_weight" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esg_weight_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_configs" (
    "id" UUID NOT NULL,
    "pillar" "ScoringPillar" NOT NULL,
    "metric_code" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "normalization" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_rules" (
    "id" UUID NOT NULL,
    "entity_type" "ApprovalEntityType" NOT NULL,
    "approver_role_id" UUID NOT NULL,
    "scope" "ApprovalScope" NOT NULL DEFAULT 'ANY',
    "evidence_required_override" BOOLEAN,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title_template" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "channel_defaults" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" UUID NOT NULL,
    "event_code" TEXT NOT NULL,
    "template_id" UUID NOT NULL,
    "channels" JSONB NOT NULL,
    "recipient_strategy" "RecipientStrategy" NOT NULL,
    "recipient_role_id" UUID,
    "schedule_cron" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widget_configs" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "widget_code" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "dashboard_widget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID,
    "module_scope" JSONB NOT NULL,
    "columns" JSONB NOT NULL,
    "filters" JSONB,
    "group_by" JSONB,
    "aggregations" JSONB,
    "chart_type" TEXT,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "direction" "MetricDirection" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "head_user_id" UUID,
    "parent_department_id" UUID,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emission_factors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit_id" UUID NOT NULL,
    "scope_id" UUID NOT NULL,
    "factor_value" DECIMAL(14,6) NOT NULL,
    "source_reference" TEXT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "emission_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_esg_profiles" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "carbon_footprint_per_unit" DECIMAL(14,6),
    "recyclability_pct" DECIMAL(5,2),
    "sustainability_rating" TEXT,
    "certifications" JSONB,

    CONSTRAINT "product_esg_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environmental_goals" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" UUID,
    "metric_code" TEXT NOT NULL,
    "target_value" DECIMAL(18,4) NOT NULL,
    "baseline_value" DECIMAL(18,4),
    "unit_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status_id" UUID,
    "progress_pct" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "environmental_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_policies" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document_attachment_id" UUID,
    "effective_date" DATE,
    "acknowledgement_deadline" DATE,
    "audience" "PolicyAudience" NOT NULL DEFAULT 'ALL',
    "audience_department_id" UUID,
    "status_id" UUID,
    "published_at" TIMESTAMP(3),
    "published_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "esg_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_key" TEXT,
    "unlock_rule" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points_required" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_key" TEXT,
    "status_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_records" (
    "id" UUID NOT NULL,
    "record_type" "RecordType" NOT NULL,
    "department_id" UUID NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_id" UUID NOT NULL,
    "amount" DECIMAL(18,2),
    "occurred_at" DATE NOT NULL,
    "external_ref" TEXT,
    "emission_category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "operational_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carbon_transactions" (
    "id" UUID NOT NULL,
    "operational_record_id" UUID,
    "department_id" UUID NOT NULL,
    "emission_factor_id" UUID NOT NULL,
    "factor_value_snapshot" DECIMAL(14,6) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit_id" UUID NOT NULL,
    "co2e_kg" DECIMAL(18,4) NOT NULL,
    "calculation_mode" "CalculationMode" NOT NULL,
    "occurred_at" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "carbon_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csr_activities" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "description" TEXT,
    "department_id" UUID,
    "location" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "capacity" INTEGER,
    "points_value" INTEGER NOT NULL DEFAULT 0,
    "evidence_required_override" BOOLEAN,
    "status_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "csr_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csr_participations" (
    "id" UUID NOT NULL,
    "csr_activity_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "status_id" UUID,
    "proof_attachment_id" UUID,
    "points_earned" INTEGER,
    "completion_date" DATE,
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csr_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "description" TEXT,
    "xp_value" INTEGER NOT NULL,
    "difficulty_id" UUID,
    "evidence_required" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE NOT NULL,
    "deadline" DATE NOT NULL,
    "status_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participations" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "proof_attachment_id" UUID,
    "status_id" UUID,
    "xp_awarded" INTEGER,
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "entry_type" "XpEntryType" NOT NULL,
    "points" INTEGER NOT NULL,
    "source_type" "XpSourceType" NOT NULL,
    "source_id" UUID,
    "balance_after" INTEGER NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_awards" (
    "id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awarded_mode" "AwardMode" NOT NULL,
    "rule_snapshot" JSONB,

    CONSTRAINT "badge_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" UUID NOT NULL,
    "reward_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "status_id" UUID,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilled_at" TIMESTAMP(3),
    "fulfilled_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acknowledgements" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "employee_id" UUID NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_audits" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "audit_type" TEXT,
    "scope_description" TEXT,
    "department_id" UUID,
    "auditor_id" UUID NOT NULL,
    "planned_start" DATE,
    "planned_end" DATE,
    "actual_start" DATE,
    "actual_end" DATE,
    "status_id" UUID,
    "findings_summary" TEXT,
    "audit_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "governance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_issues" (
    "id" UUID NOT NULL,
    "governance_audit_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "due_date" DATE NOT NULL,
    "raised_by" UUID,
    "raised_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_id" UUID,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_scores" (
    "id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "environmental_score" DECIMAL(5,2) NOT NULL,
    "social_score" DECIMAL(5,2) NOT NULL,
    "governance_score" DECIMAL(5,2) NOT NULL,
    "total_score" DECIMAL(5,2) NOT NULL,
    "weight_config_snapshot" JSONB NOT NULL,
    "metric_breakdown" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diversity_metric_records" (
    "id" UUID NOT NULL,
    "department_id" UUID,
    "metric_definition_id" UUID NOT NULL,
    "period" DATE NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diversity_metric_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "training_name" TEXT NOT NULL,
    "completed_at" DATE,
    "hours" DECIMAL(6,2),
    "status_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rule_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "event_code" TEXT,
    "entity_type" TEXT,
    "entity_id" UUID,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "file_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" UUID NOT NULL,
    "requested_by" UUID,
    "template_id" UUID,
    "format" "ReportFormat" NOT NULL,
    "filters" JSONB,
    "file_key" TEXT,
    "status" "ExportStatus" NOT NULL DEFAULT 'Queued',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_types_code_key" ON "lookup_types"("code");

-- CreateIndex
CREATE INDEX "lookup_values_lookup_type_id_idx" ON "lookup_values"("lookup_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_values_lookup_type_id_code_key" ON "lookup_values"("lookup_type_id", "code");

-- CreateIndex
CREATE INDEX "lookup_transitions_lookup_type_id_idx" ON "lookup_transitions"("lookup_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_transitions_from_value_id_to_value_id_key" ON "lookup_transitions"("from_value_id", "to_value_id");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_configs_pillar_metric_code_key" ON "scoring_configs"("pillar", "metric_code");

-- CreateIndex
CREATE INDEX "approval_rules_entity_type_idx" ON "approval_rules"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notification_rules_event_code_idx" ON "notification_rules"("event_code");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widget_configs_role_id_widget_code_key" ON "dashboard_widget_configs"("role_id", "widget_code");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_code_key" ON "metric_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE INDEX "departments_parent_department_id_idx" ON "departments"("parent_department_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_type_key" ON "categories"("name", "type");

-- CreateIndex
CREATE INDEX "emission_factors_category_unit_id_effective_from_idx" ON "emission_factors"("category", "unit_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_esg_profiles_product_id_key" ON "product_esg_profiles"("product_id");

-- CreateIndex
CREATE INDEX "environmental_goals_department_id_idx" ON "environmental_goals"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE INDEX "operational_records_record_type_occurred_at_idx" ON "operational_records"("record_type", "occurred_at");

-- CreateIndex
CREATE INDEX "operational_records_department_id_idx" ON "operational_records"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "carbon_transactions_operational_record_id_key" ON "carbon_transactions"("operational_record_id");

-- CreateIndex
CREATE INDEX "carbon_transactions_department_id_occurred_at_idx" ON "carbon_transactions"("department_id", "occurred_at");

-- CreateIndex
CREATE INDEX "carbon_transactions_emission_factor_id_idx" ON "carbon_transactions"("emission_factor_id");

-- CreateIndex
CREATE INDEX "csr_activities_category_id_idx" ON "csr_activities"("category_id");

-- CreateIndex
CREATE INDEX "csr_activities_department_id_idx" ON "csr_activities"("department_id");

-- CreateIndex
CREATE INDEX "csr_participations_employee_id_idx" ON "csr_participations"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "csr_participations_csr_activity_id_employee_id_key" ON "csr_participations"("csr_activity_id", "employee_id");

-- CreateIndex
CREATE INDEX "challenges_category_id_idx" ON "challenges"("category_id");

-- CreateIndex
CREATE INDEX "challenge_participations_employee_id_idx" ON "challenge_participations"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participations_challenge_id_employee_id_key" ON "challenge_participations"("challenge_id", "employee_id");

-- CreateIndex
CREATE INDEX "xp_ledger_employee_id_created_at_idx" ON "xp_ledger"("employee_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_ledger_source_type_source_id_entry_type_key" ON "xp_ledger"("source_type", "source_id", "entry_type");

-- CreateIndex
CREATE INDEX "badge_awards_employee_id_idx" ON "badge_awards"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_awards_badge_id_employee_id_key" ON "badge_awards"("badge_id", "employee_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_reward_id_idx" ON "reward_redemptions"("reward_id");

-- CreateIndex
CREATE INDEX "reward_redemptions_employee_id_idx" ON "reward_redemptions"("employee_id");

-- CreateIndex
CREATE INDEX "policy_acknowledgements_employee_id_idx" ON "policy_acknowledgements"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acknowledgements_policy_id_policy_version_employee_i_key" ON "policy_acknowledgements"("policy_id", "policy_version", "employee_id");

-- CreateIndex
CREATE INDEX "governance_audits_department_id_idx" ON "governance_audits"("department_id");

-- CreateIndex
CREATE INDEX "compliance_issues_status_id_due_date_idx" ON "compliance_issues"("status_id", "due_date");

-- CreateIndex
CREATE INDEX "compliance_issues_owner_id_idx" ON "compliance_issues"("owner_id");

-- CreateIndex
CREATE INDEX "department_scores_department_id_idx" ON "department_scores"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_scores_department_id_period_start_period_end_key" ON "department_scores"("department_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "diversity_metric_records_metric_definition_id_idx" ON "diversity_metric_records"("metric_definition_id");

-- CreateIndex
CREATE INDEX "diversity_metric_records_department_id_idx" ON "diversity_metric_records"("department_id");

-- CreateIndex
CREATE INDEX "training_records_employee_id_idx" ON "training_records"("employee_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_values" ADD CONSTRAINT "lookup_values_lookup_type_id_fkey" FOREIGN KEY ("lookup_type_id") REFERENCES "lookup_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_esg_profiles" ADD CONSTRAINT "product_esg_profiles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_transactions" ADD CONSTRAINT "carbon_transactions_operational_record_id_fkey" FOREIGN KEY ("operational_record_id") REFERENCES "operational_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carbon_transactions" ADD CONSTRAINT "carbon_transactions_emission_factor_id_fkey" FOREIGN KEY ("emission_factor_id") REFERENCES "emission_factors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_activities" ADD CONSTRAINT "csr_activities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_participations" ADD CONSTRAINT "csr_participations_csr_activity_id_fkey" FOREIGN KEY ("csr_activity_id") REFERENCES "csr_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_participations" ADD CONSTRAINT "csr_participations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badge_awards" ADD CONSTRAINT "badge_awards_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "esg_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_acknowledgements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_issues" ADD CONSTRAINT "compliance_issues_governance_audit_id_fkey" FOREIGN KEY ("governance_audit_id") REFERENCES "governance_audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diversity_metric_records" ADD CONSTRAINT "diversity_metric_records_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- Appended by hand: CHECK constraints, lookup-value FKs, and remaining entity
-- FKs with indexes. Prisma cannot express CHECKs declaratively (spec §A3, §A8).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── CHECK constraints ──────────────────────────────────────────────────────
ALTER TABLE "esg_weight_configs"
  ADD CONSTRAINT "chk_weights_sum_100" CHECK ("environmental_weight" + "social_weight" + "governance_weight" = 100),
  ADD CONSTRAINT "chk_weights_nonneg" CHECK ("environmental_weight" >= 0 AND "social_weight" >= 0 AND "governance_weight" >= 0);

ALTER TABLE "scoring_configs"
  ADD CONSTRAINT "chk_scoring_weight_nonneg" CHECK ("weight" >= 0);

ALTER TABLE "emission_factors"
  ADD CONSTRAINT "chk_factor_value_pos" CHECK ("factor_value" > 0),
  ADD CONSTRAINT "chk_factor_dates" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");

ALTER TABLE "operational_records"
  ADD CONSTRAINT "chk_oprec_qty_pos" CHECK ("quantity" > 0);

ALTER TABLE "carbon_transactions"
  ADD CONSTRAINT "chk_carbon_qty_pos" CHECK ("quantity" > 0),
  ADD CONSTRAINT "chk_carbon_co2e_nonneg" CHECK ("co2e_kg" >= 0);

ALTER TABLE "environmental_goals"
  ADD CONSTRAINT "chk_goal_period" CHECK ("period_end" > "period_start");

ALTER TABLE "product_esg_profiles"
  ADD CONSTRAINT "chk_recyclability_pct" CHECK ("recyclability_pct" IS NULL OR ("recyclability_pct" >= 0 AND "recyclability_pct" <= 100));

ALTER TABLE "rewards"
  ADD CONSTRAINT "chk_reward_points_pos" CHECK ("points_required" > 0),
  ADD CONSTRAINT "chk_reward_stock_nonneg" CHECK ("stock" >= 0);

ALTER TABLE "reward_redemptions"
  ADD CONSTRAINT "chk_redemption_points_nonneg" CHECK ("points_spent" >= 0);

ALTER TABLE "xp_ledger"
  ADD CONSTRAINT "chk_xp_balance_nonneg" CHECK ("balance_after" >= 0);

ALTER TABLE "csr_activities"
  ADD CONSTRAINT "chk_csr_dates" CHECK ("end_date" >= "start_date"),
  ADD CONSTRAINT "chk_csr_points_nonneg" CHECK ("points_value" >= 0);

ALTER TABLE "challenges"
  ADD CONSTRAINT "chk_challenge_xp_pos" CHECK ("xp_value" > 0),
  ADD CONSTRAINT "chk_challenge_deadline" CHECK ("deadline" > "start_date");

ALTER TABLE "challenge_participations"
  ADD CONSTRAINT "chk_progress_pct" CHECK ("progress_pct" >= 0 AND "progress_pct" <= 100);

ALTER TABLE "governance_audits"
  ADD CONSTRAINT "chk_audit_planned_dates" CHECK ("planned_start" IS NULL OR "planned_end" IS NULL OR "planned_end" >= "planned_start"),
  ADD CONSTRAINT "chk_audit_score_range" CHECK ("audit_score" IS NULL OR ("audit_score" >= 0 AND "audit_score" <= 100));

ALTER TABLE "compliance_issues"
  ADD CONSTRAINT "chk_issue_due_after_raised" CHECK ("due_date" >= "raised_date");

ALTER TABLE "department_scores"
  ADD CONSTRAINT "chk_dept_scores_range" CHECK (
    "environmental_score" >= 0 AND "environmental_score" <= 100 AND
    "social_score" >= 0 AND "social_score" <= 100 AND
    "governance_score" >= 0 AND "governance_score" <= 100 AND
    "total_score" >= 0 AND "total_score" <= 100
  ),
  ADD CONSTRAINT "chk_dept_scores_period" CHECK ("period_end" > "period_start");

-- ── Lookup-value foreign keys (RESTRICT: business values deactivate, never delete) ──
CREATE INDEX "idx_lt_lookup_type" ON "lookup_transitions"("lookup_type_id");
ALTER TABLE "lookup_transitions"
  ADD CONSTRAINT "fk_lt_type" FOREIGN KEY ("lookup_type_id") REFERENCES "lookup_types"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_lt_from" FOREIGN KEY ("from_value_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_lt_to" FOREIGN KEY ("to_value_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_ef_unit" ON "emission_factors"("unit_id");
CREATE INDEX "idx_ef_scope" ON "emission_factors"("scope_id");
ALTER TABLE "emission_factors"
  ADD CONSTRAINT "fk_ef_unit" FOREIGN KEY ("unit_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_ef_scope" FOREIGN KEY ("scope_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_oprec_unit" ON "operational_records"("unit_id");
ALTER TABLE "operational_records"
  ADD CONSTRAINT "fk_oprec_unit" FOREIGN KEY ("unit_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_carbon_unit" ON "carbon_transactions"("unit_id");
ALTER TABLE "carbon_transactions"
  ADD CONSTRAINT "fk_carbon_unit" FOREIGN KEY ("unit_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_goal_status" ON "environmental_goals"("status_id");
CREATE INDEX "idx_goal_unit" ON "environmental_goals"("unit_id");
ALTER TABLE "environmental_goals"
  ADD CONSTRAINT "fk_goal_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_goal_unit" FOREIGN KEY ("unit_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_policy_status" ON "esg_policies"("status_id");
ALTER TABLE "esg_policies"
  ADD CONSTRAINT "fk_policy_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_reward_status" ON "rewards"("status_id");
ALTER TABLE "rewards"
  ADD CONSTRAINT "fk_reward_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_csr_status" ON "csr_activities"("status_id");
ALTER TABLE "csr_activities"
  ADD CONSTRAINT "fk_csr_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_csrpart_status" ON "csr_participations"("status_id");
ALTER TABLE "csr_participations"
  ADD CONSTRAINT "fk_csrpart_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_challenge_status" ON "challenges"("status_id");
CREATE INDEX "idx_challenge_difficulty" ON "challenges"("difficulty_id");
ALTER TABLE "challenges"
  ADD CONSTRAINT "fk_challenge_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_challenge_difficulty" FOREIGN KEY ("difficulty_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_chalpart_status" ON "challenge_participations"("status_id");
ALTER TABLE "challenge_participations"
  ADD CONSTRAINT "fk_chalpart_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_redemption_status" ON "reward_redemptions"("status_id");
ALTER TABLE "reward_redemptions"
  ADD CONSTRAINT "fk_redemption_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_audit_status" ON "governance_audits"("status_id");
ALTER TABLE "governance_audits"
  ADD CONSTRAINT "fk_audit_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_issue_severity" ON "compliance_issues"("severity_id");
ALTER TABLE "compliance_issues"
  ADD CONSTRAINT "fk_issue_severity" FOREIGN KEY ("severity_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_issue_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

CREATE INDEX "idx_training_status" ON "training_records"("status_id");
ALTER TABLE "training_records"
  ADD CONSTRAINT "fk_training_status" FOREIGN KEY ("status_id") REFERENCES "lookup_values"("id") ON DELETE RESTRICT;

-- ── Remaining entity foreign keys (scalar refs not modeled as Prisma relations) ──
-- Department refs (RESTRICT — masters referenced by transactions, spec §A5)
-- (department_id columns are already indexed via Prisma @@index; add FKs only)
ALTER TABLE "operational_records"
  ADD CONSTRAINT "fk_oprec_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
-- carbon_transactions already has @@index([department_id, occurred_at]); add FK only
ALTER TABLE "carbon_transactions"
  ADD CONSTRAINT "fk_carbon_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
-- csr_activities, environmental_goals, diversity, department_scores already indexed on department_id
ALTER TABLE "csr_activities"
  ADD CONSTRAINT "fk_csr_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
ALTER TABLE "environmental_goals"
  ADD CONSTRAINT "fk_goal_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
ALTER TABLE "diversity_metric_records"
  ADD CONSTRAINT "fk_diversity_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
ALTER TABLE "department_scores"
  ADD CONSTRAINT "fk_score_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
CREATE INDEX "idx_policy_audience_dept" ON "esg_policies"("audience_department_id");
ALTER TABLE "esg_policies"
  ADD CONSTRAINT "fk_policy_audience_dept" FOREIGN KEY ("audience_department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
ALTER TABLE "governance_audits"
  ADD CONSTRAINT "fk_audit_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;

-- User refs
CREATE INDEX "idx_dept_head" ON "departments"("head_user_id");
ALTER TABLE "departments"
  ADD CONSTRAINT "fk_dept_head" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX "idx_audit_auditor" ON "governance_audits"("auditor_id");
ALTER TABLE "governance_audits"
  ADD CONSTRAINT "fk_audit_auditor" FOREIGN KEY ("auditor_id") REFERENCES "users"("id") ON DELETE RESTRICT;
-- compliance_issues.owner_id already indexed; owner RESTRICT, raised_by SET NULL
ALTER TABLE "compliance_issues"
  ADD CONSTRAINT "fk_issue_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_issue_raised_by" FOREIGN KEY ("raised_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- Role refs
CREATE INDEX "idx_invitation_role" ON "invitations"("role_id");
CREATE INDEX "idx_invitation_dept" ON "invitations"("department_id");
ALTER TABLE "invitations"
  ADD CONSTRAINT "fk_invitation_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "fk_invitation_dept" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT;
CREATE INDEX "idx_approval_role" ON "approval_rules"("approver_role_id");
ALTER TABLE "approval_rules"
  ADD CONSTRAINT "fk_approval_role" FOREIGN KEY ("approver_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
CREATE INDEX "idx_notifrule_role" ON "notification_rules"("recipient_role_id");
ALTER TABLE "notification_rules"
  ADD CONSTRAINT "fk_notifrule_role" FOREIGN KEY ("recipient_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;
ALTER TABLE "dashboard_widget_configs"
  ADD CONSTRAINT "fk_widget_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;

-- governance_audit link on issues (nullable, already relation-backed in schema? no — add FK)
CREATE INDEX "idx_issue_audit" ON "compliance_issues"("governance_audit_id");
