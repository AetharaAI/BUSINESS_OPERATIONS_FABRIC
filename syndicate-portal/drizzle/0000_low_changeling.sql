CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "bof_crm";
--> statement-breakpoint
CREATE TYPE "public"."bof_crm_contract_state" AS ENUM('draft', 'approval_pending', 'approved', 'generated', 'sent', 'viewed', 'completed', 'declined', 'expired', 'voided', 'error');--> statement-breakpoint
CREATE TYPE "public"."bof_crm_deal_stage" AS ENUM('lead', 'qualified', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost');--> statement-breakpoint
CREATE TABLE "bof_crm"."companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" varchar(255),
	"industry" varchar(120),
	"notes" text,
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"title" varchar(120),
	"notes" text,
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."contract_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"from_state" "bof_crm_contract_state",
	"to_state" "bof_crm_contract_state",
	"source" varchar(64) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_user_id" uuid,
	"actor_subject" text,
	"actor_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."contract_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(64) DEFAULT 'signer' NOT NULL,
	"routing_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid,
	"company_id" uuid,
	"primary_contact_id" uuid,
	"title" varchar(255) NOT NULL,
	"state" "bof_crm_contract_state" DEFAULT 'draft' NOT NULL,
	"approved_template_id" varchar(255),
	"contract_value" numeric(12, 2),
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"requires_human_approval_before_send" boolean DEFAULT true NOT NULL,
	"legal_terms_locked" boolean DEFAULT true NOT NULL,
	"custom_legal_terms" text,
	"external_provider" varchar(64) DEFAULT 'pandadoc' NOT NULL,
	"external_contract_id" varchar(255),
	"generated_document_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"company_id" uuid,
	"primary_contact_id" uuid,
	"name" varchar(255) NOT NULL,
	"stage" "bof_crm_deal_stage" DEFAULT 'lead' NOT NULL,
	"amount_cents" integer,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"notes" text,
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bof_crm"."tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid,
	"contract_id" uuid,
	"title" varchar(255) NOT NULL,
	"status" varchar(64) DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"assigned_to_user_id" uuid,
	"notes" text,
	"created_by_user_id" uuid,
	"created_by_subject" text,
	"created_by_role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bof_crm"."contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "bof_crm"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_events" ADD CONSTRAINT "contract_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "bof_crm"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_recipients" ADD CONSTRAINT "contract_recipients_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "bof_crm"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."contracts" ADD CONSTRAINT "contracts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "bof_crm"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."contracts" ADD CONSTRAINT "contracts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "bof_crm"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."contracts" ADD CONSTRAINT "contracts_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "bof_crm"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."deals" ADD CONSTRAINT "deals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "bof_crm"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."deals" ADD CONSTRAINT "deals_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "bof_crm"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "bof_crm"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bof_crm"."tasks" ADD CONSTRAINT "tasks_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "bof_crm"."contracts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "companies_workspace_tenant_idx" ON "bof_crm"."companies" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "contacts_workspace_tenant_idx" ON "bof_crm"."contacts" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "deals_workspace_tenant_idx" ON "bof_crm"."deals" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "contracts_workspace_tenant_idx" ON "bof_crm"."contracts" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "contract_events_workspace_tenant_idx" ON "bof_crm"."contract_events" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "contract_recipients_workspace_tenant_idx" ON "bof_crm"."contract_recipients" ("workspace_id", "tenant_id");
--> statement-breakpoint
CREATE INDEX "tasks_workspace_tenant_idx" ON "bof_crm"."tasks" ("workspace_id", "tenant_id");
--> statement-breakpoint
ALTER TABLE "bof_crm"."companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contracts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_recipients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."companies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contacts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."deals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contracts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_recipients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."contract_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bof_crm"."tasks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "companies_workspace_isolation" ON "bof_crm"."companies"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "contacts_workspace_isolation" ON "bof_crm"."contacts"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "deals_workspace_isolation" ON "bof_crm"."deals"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "contracts_workspace_isolation" ON "bof_crm"."contracts"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "contract_recipients_workspace_isolation" ON "bof_crm"."contract_recipients"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "contract_events_workspace_isolation" ON "bof_crm"."contract_events"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
--> statement-breakpoint
CREATE POLICY "tasks_workspace_isolation" ON "bof_crm"."tasks"
  USING ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("workspace_id" = current_setting('app.workspace_id', true)::uuid AND "tenant_id" = current_setting('app.tenant_id', true)::uuid);
