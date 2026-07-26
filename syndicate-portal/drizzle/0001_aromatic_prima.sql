CREATE TYPE "public"."bof_workforce_agreement_status" AS ENUM('draft', 'pending', 'completed', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_document_status" AS ENUM('requested', 'received', 'verified', 'expired', 'replaced');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_document_type" AS ENUM('w8_ben', 'i9', 'other');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_onboarding_case_status" AS ENUM('draft', 'invited', 'identity_confirmed', 'documents_pending', 'access_pending', 'active', 'blocked', 'suspended', 'cancelled', 'offboarded');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_person_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_grant_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_relationship_status" AS ENUM('draft', 'active', 'inactive', 'suspended', 'ended');--> statement-breakpoint
CREATE TYPE "public"."bof_workforce_relationship_type" AS ENUM('employee', 'independent_contractor', 'sales_representative', 'advisor', 'vendor');--> statement-breakpoint
CREATE TABLE "bof_crm"."agreement_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid,
	"workforce_relationship_id" uuid,
	"provider" varchar(64) NOT NULL,
	"provider_document_ref" varchar(255) NOT NULL,
	"agreement_type" varchar(120) NOT NULL,
	"status" "bof_workforce_agreement_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"document_storage_ref" text,
	"certificate_storage_ref" text,
	"sha256" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."compliance_document_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"workforce_relationship_id" uuid NOT NULL,
	"document_type" "bof_workforce_document_type" NOT NULL,
	"status" "bof_workforce_document_status" DEFAULT 'requested' NOT NULL,
	"required_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"storage_ref" text,
	"verification_status" "bof_workforce_verification_status" DEFAULT 'pending' NOT NULL,
	"verified_by_actor" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."compliance_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"requirement_id" uuid NOT NULL,
	"storage_ref" text NOT NULL,
	"sha256" varchar(128) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."onboarding_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"workforce_relationship_id" uuid NOT NULL,
	"status" "bof_workforce_onboarding_case_status" DEFAULT 'draft' NOT NULL,
	"current_step" varchar(120) DEFAULT 'draft' NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"assigned_operator" varchar(255),
	"created_by_actor" text NOT NULL,
	"invite_email" varchar(255),
	"invite_status" varchar(64) DEFAULT 'not_sent' NOT NULL,
	"invite_sent_at" timestamp with time zone,
	"last_invite_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"primary_email" varchar(255) NOT NULL,
	"primary_phone" varchar(64),
	"status" "bof_workforce_person_status" DEFAULT 'active' NOT NULL,
	"source" varchar(64) DEFAULT 'bof' NOT NULL,
	"source_ref" varchar(255),
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."workforce_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" text,
	"actor_type" varchar(64) NOT NULL,
	"actor_role" text,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(120) NOT NULL,
	"target_id" text,
	"result" varchar(64) NOT NULL,
	"correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."workforce_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"relationship_type" "bof_workforce_relationship_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "bof_workforce_relationship_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"manager_person_id" uuid,
	"compensation_plan_ref" varchar(255),
	"created_by_actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."workforce_role_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role_key" varchar(120) NOT NULL,
	"capability_scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone,
	"status" "bof_workforce_grant_status" DEFAULT 'active' NOT NULL,
	"granted_by_actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bof_crm"."agreement_records" ADD CONSTRAINT "agreement_records_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "bof_crm"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."agreement_records" ADD CONSTRAINT "agreement_records_workforce_relationship_id_workforce_relationships_id_fk" FOREIGN KEY ("workforce_relationship_id") REFERENCES "bof_crm"."workforce_relationships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_requirements" ADD CONSTRAINT "compliance_document_requirements_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "bof_crm"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_requirements" ADD CONSTRAINT "compliance_document_requirements_workforce_relationship_id_workforce_relationships_id_fk" FOREIGN KEY ("workforce_relationship_id") REFERENCES "bof_crm"."workforce_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_versions" ADD CONSTRAINT "compliance_document_versions_requirement_id_compliance_document_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "bof_crm"."compliance_document_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."onboarding_cases" ADD CONSTRAINT "onboarding_cases_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "bof_crm"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."onboarding_cases" ADD CONSTRAINT "onboarding_cases_workforce_relationship_id_workforce_relationships_id_fk" FOREIGN KEY ("workforce_relationship_id") REFERENCES "bof_crm"."workforce_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_relationships" ADD CONSTRAINT "workforce_relationships_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "bof_crm"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_role_grants" ADD CONSTRAINT "workforce_role_grants_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "bof_crm"."people"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "people_workspace_tenant_idx" ON "bof_crm"."people" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "people_workspace_email_unique_idx" ON "bof_crm"."people" ("workspace_id", lower("primary_email"));
--> statement-breakpoint
CREATE INDEX "workforce_relationships_workspace_tenant_idx" ON "bof_crm"."workforce_relationships" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "workforce_role_grants_workspace_tenant_idx" ON "bof_crm"."workforce_role_grants" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "agreement_records_workspace_tenant_idx" ON "bof_crm"."agreement_records" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "compliance_document_requirements_workspace_tenant_idx" ON "bof_crm"."compliance_document_requirements" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "compliance_document_versions_workspace_tenant_idx" ON "bof_crm"."compliance_document_versions" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "onboarding_cases_workspace_tenant_idx" ON "bof_crm"."onboarding_cases" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "workforce_receipts_workspace_tenant_idx" ON "bof_crm"."workforce_receipts" ("workspace_id", "tenant_id");
--> statement-breakpoint
ALTER TABLE "bof_crm"."people" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_relationships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_role_grants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."agreement_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_requirements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."onboarding_cases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_receipts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."people" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_relationships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_role_grants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."agreement_records" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_requirements" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."compliance_document_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."onboarding_cases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."workforce_receipts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "people_workspace_isolation" ON "bof_crm"."people"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "workforce_relationships_workspace_isolation" ON "bof_crm"."workforce_relationships"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "workforce_role_grants_workspace_isolation" ON "bof_crm"."workforce_role_grants"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "agreement_records_workspace_isolation" ON "bof_crm"."agreement_records"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "compliance_document_requirements_workspace_isolation" ON "bof_crm"."compliance_document_requirements"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "compliance_document_versions_workspace_isolation" ON "bof_crm"."compliance_document_versions"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "onboarding_cases_workspace_isolation" ON "bof_crm"."onboarding_cases"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "workforce_receipts_workspace_isolation" ON "bof_crm"."workforce_receipts"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
