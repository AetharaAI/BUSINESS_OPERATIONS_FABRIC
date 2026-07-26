import { workforceService } from "./lib/server/workforce/service";
import { SessionMe } from "./lib/types/portal";
import { WorkforceOnboardingUpsertRequest } from "./lib/types/workforce";

type OperatorSession = SessionMe & {
  operator_name: string;
};

type PlaybookPreset = "promise_seed" | "employee_preview" | "operator_preview";

const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
};

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const operatorSession = (): OperatorSession => {
  const tenantId = required(process.env.BOF_TENANT_ID, "BOF_TENANT_ID");
  const workspaceId = required(process.env.BOF_WORKSPACE_ID, "BOF_WORKSPACE_ID");
  const operatorEmail = required(process.env.WORKFORCE_DEFAULT_OPERATOR_EMAIL, "WORKFORCE_DEFAULT_OPERATOR_EMAIL");
  const operatorName = process.env.WORKFORCE_OPERATOR_NAME ?? "AetherPro Operator";

  return {
    user_id: process.env.WORKFORCE_OPERATOR_USER_ID ?? null,
    tenant_id: tenantId,
    email: operatorEmail,
    role: "owner",
    is_platform_admin: true,
    subject: process.env.WORKFORCE_OPERATOR_SUBJECT ?? operatorEmail,
    handle: process.env.WORKFORCE_OPERATOR_HANDLE ?? operatorEmail.split("@")[0],
    workforce_role: "platform_admin",
    capability_scope: ["tenant.onboarding.read_all", "tenant.onboarding.update_all", "workforce.admin"],
    tenant_scope_mode: "all",
    workspace_id: workspaceId,
    person_id: null,
    operator_name: operatorName
  };
};

const isoNow = () => new Date().toISOString();

const previewRef = (prefix: string) => `${prefix}-${new Date().toISOString().slice(0, 10)}`;

const buildPresetInput = (preset: PlaybookPreset, session: OperatorSession): WorkforceOnboardingUpsertRequest => {
  if (preset === "promise_seed") {
    return workforceService.getPromiseSeedInput(session);
  }

  if (preset === "operator_preview") {
    return {
      workspace_id: session.workspace_id!,
      tenant_id: session.tenant_id!,
      display_name: process.env.WORKFORCE_PERSON_NAME ?? "Operator Preview",
      primary_email: process.env.WORKFORCE_PERSON_EMAIL ?? "operator-preview-2026-07-17@aetherpro.us",
      primary_phone: null,
      relationship_type: "employee",
      title: process.env.WORKFORCE_PERSON_TITLE ?? "Internal Operator Preview",
      role_key: "internal_operator",
      start_date: process.env.WORKFORCE_START_DATE ?? isoNow(),
      agreement_provider: process.env.WORKFORCE_AGREEMENT_PROVIDER ?? "ops_preview",
      agreement_provider_document_ref: process.env.WORKFORCE_AGREEMENT_REF ?? previewRef("operator-preview"),
      agreement_type: process.env.WORKFORCE_AGREEMENT_TYPE ?? "internal_operator_preview",
      agreement_status: "completed",
      agreement_completed_at: process.env.WORKFORCE_AGREEMENT_COMPLETED_AT ?? isoNow(),
      document_storage_ref: null,
      certificate_storage_ref: null,
      agreement_sha256: null,
      compliance_document_type: "other",
      compliance_notes: process.env.WORKFORCE_COMPLIANCE_NOTES ?? "Operator preview profile for surface verification.",
      assigned_operator: session.email
    };
  }

  return {
    workspace_id: session.workspace_id!,
    tenant_id: session.tenant_id!,
    display_name: process.env.WORKFORCE_PERSON_NAME ?? "Employee Preview",
    primary_email: process.env.WORKFORCE_PERSON_EMAIL ?? "employee-preview-2026-07-17@aetherpro.us",
    primary_phone: null,
    relationship_type: "employee",
    title: process.env.WORKFORCE_PERSON_TITLE ?? "Internal Sales Representative Preview",
    role_key: "internal_sales_rep",
    start_date: process.env.WORKFORCE_START_DATE ?? isoNow(),
    agreement_provider: process.env.WORKFORCE_AGREEMENT_PROVIDER ?? "ops_preview",
    agreement_provider_document_ref: process.env.WORKFORCE_AGREEMENT_REF ?? previewRef("employee-preview"),
    agreement_type: process.env.WORKFORCE_AGREEMENT_TYPE ?? "internal_sales_rep_preview",
    agreement_status: "completed",
    agreement_completed_at: process.env.WORKFORCE_AGREEMENT_COMPLETED_AT ?? isoNow(),
    document_storage_ref: null,
    certificate_storage_ref: null,
    agreement_sha256: null,
    compliance_document_type: "other",
    compliance_notes: process.env.WORKFORCE_COMPLIANCE_NOTES ?? "Employee preview profile for workforce surface verification.",
    assigned_operator: session.email
  };
};

const operatorSeedInput = (session: OperatorSession): WorkforceOnboardingUpsertRequest => ({
  workspace_id: session.workspace_id!,
  tenant_id: session.tenant_id!,
  display_name: session.operator_name,
  primary_email: session.email!,
  primary_phone: null,
  relationship_type: "employee",
  title: "Operations Administrator",
  role_key: "internal_operator",
  start_date: new Date("2026-07-16T00:00:00Z").toISOString(),
  agreement_provider: "ops_manual",
  agreement_provider_document_ref: `ops-seed-${session.tenant_id}`,
  agreement_type: "internal_operations_assignment",
  agreement_status: "completed",
  agreement_completed_at: new Date("2026-07-16T00:00:00Z").toISOString(),
  document_storage_ref: null,
  certificate_storage_ref: null,
  agreement_sha256: null,
  compliance_document_type: "other",
  compliance_notes: "Internal operator seed for workforce administration.",
  assigned_operator: session.email
});

const summarize = (label: string, bundle: Awaited<ReturnType<typeof workforceService.upsertOnboardingCase>>) => ({
  label,
  person_id: bundle.person.id,
  email: bundle.person.primary_email,
  relationship_type: bundle.relationship.relationship_type,
  role: bundle.role_grant?.role_key ?? null,
  onboarding_case_id: bundle.onboarding_case?.id ?? null,
  onboarding_status: bundle.onboarding_case?.status ?? null,
  invite_status: bundle.onboarding_case?.invite_status ?? null,
  requirement_ids: bundle.compliance_requirements.map((item) => item.id)
});

const main = async () => {
  const session = operatorSession();
  const preset = (process.env.WORKFORCE_PLAYBOOK_PRESET ?? "promise_seed") as PlaybookPreset;
  const seedOperator = parseBool(process.env.WORKFORCE_PLAYBOOK_SEED_OPERATOR, true);
  const shouldInvite = parseBool(process.env.WORKFORCE_PLAYBOOK_SEND_INVITE, true);

  const operatorBundle = seedOperator ? await workforceService.upsertOnboardingCase(session, operatorSeedInput(session)) : null;
  const input = buildPresetInput(preset, session);
  const targetBundle = await workforceService.upsertOnboardingCase(session, input);
  const invite = shouldInvite && targetBundle.onboarding_case ? await workforceService.sendInvite(session, targetBundle.onboarding_case.id) : null;

  console.log(
    JSON.stringify(
      {
        playbook: {
          preset,
          seeded_operator: seedOperator,
          sent_invite: shouldInvite,
          executed_at: isoNow()
        },
        env: {
          BOF_WORKSPACE_ID: process.env.BOF_WORKSPACE_ID ?? null,
          BOF_TENANT_ID: process.env.BOF_TENANT_ID ?? null,
          WORKFORCE_STORAGE_MODE: process.env.WORKFORCE_STORAGE_MODE ?? null,
          WORKFORCE_STORAGE_BUCKET: process.env.WORKFORCE_STORAGE_BUCKET ?? null
        },
        operator: operatorBundle ? summarize("operator", operatorBundle) : null,
        target: summarize("target", targetBundle),
        invite
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
