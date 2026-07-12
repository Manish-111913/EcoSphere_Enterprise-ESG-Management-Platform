-- DropForeignKey
ALTER TABLE "approval_rules" DROP CONSTRAINT "fk_approval_role";

-- DropForeignKey
ALTER TABLE "carbon_transactions" DROP CONSTRAINT "fk_carbon_dept";

-- DropForeignKey
ALTER TABLE "carbon_transactions" DROP CONSTRAINT "fk_carbon_unit";

-- DropForeignKey
ALTER TABLE "challenge_participations" DROP CONSTRAINT "fk_chalpart_status";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "fk_challenge_difficulty";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "fk_challenge_status";

-- DropForeignKey
ALTER TABLE "compliance_issues" DROP CONSTRAINT "fk_issue_owner";

-- DropForeignKey
ALTER TABLE "compliance_issues" DROP CONSTRAINT "fk_issue_raised_by";

-- DropForeignKey
ALTER TABLE "compliance_issues" DROP CONSTRAINT "fk_issue_severity";

-- DropForeignKey
ALTER TABLE "compliance_issues" DROP CONSTRAINT "fk_issue_status";

-- DropForeignKey
ALTER TABLE "csr_activities" DROP CONSTRAINT "fk_csr_dept";

-- DropForeignKey
ALTER TABLE "csr_activities" DROP CONSTRAINT "fk_csr_status";

-- DropForeignKey
ALTER TABLE "csr_participations" DROP CONSTRAINT "fk_csrpart_status";

-- DropForeignKey
ALTER TABLE "dashboard_widget_configs" DROP CONSTRAINT "fk_widget_role";

-- DropForeignKey
ALTER TABLE "department_scores" DROP CONSTRAINT "fk_score_dept";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "fk_dept_head";

-- DropForeignKey
ALTER TABLE "diversity_metric_records" DROP CONSTRAINT "fk_diversity_dept";

-- DropForeignKey
ALTER TABLE "emission_factors" DROP CONSTRAINT "fk_ef_scope";

-- DropForeignKey
ALTER TABLE "emission_factors" DROP CONSTRAINT "fk_ef_unit";

-- DropForeignKey
ALTER TABLE "environmental_goals" DROP CONSTRAINT "fk_goal_dept";

-- DropForeignKey
ALTER TABLE "environmental_goals" DROP CONSTRAINT "fk_goal_status";

-- DropForeignKey
ALTER TABLE "environmental_goals" DROP CONSTRAINT "fk_goal_unit";

-- DropForeignKey
ALTER TABLE "esg_policies" DROP CONSTRAINT "fk_policy_audience_dept";

-- DropForeignKey
ALTER TABLE "esg_policies" DROP CONSTRAINT "fk_policy_status";

-- DropForeignKey
ALTER TABLE "governance_audits" DROP CONSTRAINT "fk_audit_auditor";

-- DropForeignKey
ALTER TABLE "governance_audits" DROP CONSTRAINT "fk_audit_dept";

-- DropForeignKey
ALTER TABLE "governance_audits" DROP CONSTRAINT "fk_audit_status";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "fk_invitation_dept";

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "fk_invitation_role";

-- DropForeignKey
ALTER TABLE "lookup_transitions" DROP CONSTRAINT "fk_lt_from";

-- DropForeignKey
ALTER TABLE "lookup_transitions" DROP CONSTRAINT "fk_lt_to";

-- DropForeignKey
ALTER TABLE "lookup_transitions" DROP CONSTRAINT "fk_lt_type";

-- DropForeignKey
ALTER TABLE "notification_rules" DROP CONSTRAINT "fk_notifrule_role";

-- DropForeignKey
ALTER TABLE "operational_records" DROP CONSTRAINT "fk_oprec_dept";

-- DropForeignKey
ALTER TABLE "operational_records" DROP CONSTRAINT "fk_oprec_unit";

-- DropForeignKey
ALTER TABLE "reward_redemptions" DROP CONSTRAINT "fk_redemption_status";

-- DropForeignKey
ALTER TABLE "rewards" DROP CONSTRAINT "fk_reward_status";

-- DropForeignKey
ALTER TABLE "training_records" DROP CONSTRAINT "fk_training_status";

-- DropIndex
DROP INDEX "idx_approval_role";

-- DropIndex
DROP INDEX "idx_carbon_unit";

-- DropIndex
DROP INDEX "idx_chalpart_status";

-- DropIndex
DROP INDEX "idx_challenge_difficulty";

-- DropIndex
DROP INDEX "idx_challenge_status";

-- DropIndex
DROP INDEX "idx_issue_audit";

-- DropIndex
DROP INDEX "idx_issue_severity";

-- DropIndex
DROP INDEX "idx_csr_status";

-- DropIndex
DROP INDEX "idx_csrpart_status";

-- DropIndex
DROP INDEX "idx_dept_head";

-- DropIndex
DROP INDEX "idx_ef_scope";

-- DropIndex
DROP INDEX "idx_ef_unit";

-- DropIndex
DROP INDEX "idx_goal_status";

-- DropIndex
DROP INDEX "idx_goal_unit";

-- DropIndex
DROP INDEX "idx_policy_audience_dept";

-- DropIndex
DROP INDEX "idx_policy_status";

-- DropIndex
DROP INDEX "idx_audit_auditor";

-- DropIndex
DROP INDEX "idx_audit_status";

-- DropIndex
DROP INDEX "idx_invitation_dept";

-- DropIndex
DROP INDEX "idx_invitation_role";

-- DropIndex
DROP INDEX "idx_notifrule_role";

-- DropIndex
DROP INDEX "idx_oprec_unit";

-- DropIndex
DROP INDEX "idx_redemption_status";

-- DropIndex
DROP INDEX "idx_reward_status";

-- DropIndex
DROP INDEX "idx_training_status";

-- AlterTable
ALTER TABLE "lookup_types" ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;
