// @vitest-environment node

import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { SessionMe } from "@/lib/types/portal";

const resolveDatabaseUrl = (): string => {
  if (process.env.CRM_DATABASE_URL) {
    return process.env.CRM_DATABASE_URL;
  }

  const raw = execSync("docker inspect aether-postgres --format '{{json .Config.Env}}'", {
    encoding: "utf8"
  }).trim();
  const env = JSON.parse(raw) as string[];
  const passwordLine = env.find((line) => line.startsWith("SYNDICATE_DB_PASSWORD="));
  if (!passwordLine) {
    throw new Error("Unable to resolve SYNDICATE_DB_PASSWORD from aether-postgres");
  }

  const password = passwordLine.split("=")[1];
  return `postgresql://syndicate:${password}@127.0.0.1:5432/syndicate`;
};

let crmService: typeof import("@/lib/server/crm/service").crmService;
let getCrmPool: typeof import("@/lib/server/db/client").getCrmPool;
let signPandadocWebhookPayload: typeof import("@/lib/server/crm/pandadoc-adapter").signPandadocWebhookPayload;
let webhookPost: typeof import("@/app/api/webhooks/pandadoc/route").POST;
let NextRequestCtor: typeof import("next/server").NextRequest;

beforeAll(async () => {
  process.env.CRM_DATABASE_URL = resolveDatabaseUrl();
  process.env.PANDADOC_WEBHOOK_SECRET = process.env.PANDADOC_WEBHOOK_SECRET || "test-pandadoc-secret";

  ({ crmService } = await import("@/lib/server/crm/service"));
  ({ getCrmPool } = await import("@/lib/server/db/client"));
  ({ signPandadocWebhookPayload } = await import("@/lib/server/crm/pandadoc-adapter"));
  ({ POST: webhookPost } = await import("@/app/api/webhooks/pandadoc/route"));
  ({ NextRequest: NextRequestCtor } = await import("next/server"));
});

const salesRepSession: SessionMe = {
  user_id: randomUUID(),
  email: "sundaepromix@gmail.com",
  role: "owner",
  is_platform_admin: false,
  is_internal_admin: false,
  subject: "subject:sales-rep",
  handle: "sundaepromix",
  workforce_role: "internal_sales_rep",
  capability_scope: [
    "company.create",
    "contact.create",
    "deal.create",
    "deal.stage.update",
    "contract.create_draft",
    "contract.read",
    "contract.generate"
  ],
  tenant_scope_mode: "create_and_assigned_only",
  tenant_id: null,
  tenant_name: null
};

const adminSession: SessionMe = {
  user_id: randomUUID(),
  email: "ops@syndicateai.co",
  role: "admin",
  is_platform_admin: true,
  is_internal_admin: true,
  subject: "subject:platform-admin",
  handle: "ops",
  workforce_role: "platform_admin",
  capability_scope: [
    "company.create",
    "contact.create",
    "deal.create",
    "deal.stage.update",
    "contract.create_draft",
    "contract.read",
    "contract.generate",
    "contract.send",
    "contract.modify_legal_terms",
    "audit.read_all"
  ],
  tenant_scope_mode: "all",
  tenant_id: null,
  tenant_name: null
};

describe("BOF CRM data plane", () => {
  it("enforces workspace RLS boundaries at the database layer", async () => {
    const pool = getCrmPool();
    const workspaceA = randomUUID();
    const workspaceB = randomUUID();
    const tenantA = randomUUID();
    const tenantB = randomUUID();

    const clientA = await pool.connect();
    try {
      await clientA.query("begin");
      await clientA.query("select set_config('app.workspace_id', $1, true), set_config('app.tenant_id', $2, true)", [
        workspaceA,
        tenantA
      ]);
      await clientA.query(
        'insert into bof_crm.companies (workspace_id, tenant_id, name) values ($1, $2, $3)',
        [workspaceA, tenantA, `ws-a-${workspaceA}`]
      );
      await clientA.query("commit");
    } finally {
      clientA.release();
    }

    const clientB = await pool.connect();
    try {
      await clientB.query("begin");
      await clientB.query("select set_config('app.workspace_id', $1, true), set_config('app.tenant_id', $2, true)", [
        workspaceB,
        tenantB
      ]);
      const readAttempt = await clientB.query(
        "select * from bof_crm.companies where workspace_id = $1 and tenant_id = $2",
        [workspaceA, tenantA]
      );
      expect(readAttempt.rowCount).toBe(0);

      await expect(
        clientB.query('insert into bof_crm.companies (workspace_id, tenant_id, name) values ($1, $2, $3)', [
          workspaceA,
          tenantA,
          "should-fail"
        ])
      ).rejects.toThrow(/row-level security/i);
      await clientB.query("rollback");
    } finally {
      clientB.release();
    }
  });

  it("persists company -> contact -> deal and updates deal stage", async () => {
    const context = {
      workspace_id: randomUUID(),
      tenant_id: randomUUID()
    };

    const company = await crmService.createCompany(context, salesRepSession, {
      name: "Blue River Electric",
      website: "https://blueriver.example.com"
    });
    const contact = await crmService.createContact(context, salesRepSession, {
      companyId: company.id,
      firstName: "Jamie",
      lastName: "Rivera",
      email: "jamie@blueriver.example.com"
    });
    const deal = await crmService.createDeal(context, salesRepSession, {
      companyId: company.id,
      primaryContactId: contact.id,
      name: "Blue River Launch",
      stage: "lead",
      amountCents: 125000,
      currency: "USD"
    });
    const updatedDeal = await crmService.updateDealStage(context, deal.id, "proposal_sent");

    expect(company.name).toBe("Blue River Electric");
    expect(contact.companyId).toBe(company.id);
    expect(deal.primaryContactId).toBe(contact.id);
    expect(updatedDeal.stage).toBe("proposal_sent");
  });

  it("rejects illegal contract transitions and blocks sales reps from send", async () => {
    const context = {
      workspace_id: randomUUID(),
      tenant_id: randomUUID()
    };

    const contract = await crmService.createContract(context, salesRepSession, {
      title: "Growth Node Contract",
      approvedTemplateId: "tmpl_growth_node",
      contractValue: 3500,
      currency: "USD",
      requiresHumanApprovalBeforeSend: true,
      recipients: []
    });

    await expect(
      crmService.transitionContract(context, salesRepSession, contract.id, "sent")
    ).rejects.toThrow(/Illegal contract transition/i);

    await expect(crmService.sendContract(context, salesRepSession, contract.id)).rejects.toThrow(/Forbidden/i);
  });

  it("allows platform admin send and records webhook-driven completion events", async () => {
    const context = {
      workspace_id: randomUUID(),
      tenant_id: randomUUID()
    };

    const contract = await crmService.createContract(context, adminSession, {
      title: "Operator Contract",
      approvedTemplateId: "tmpl_operator",
      contractValue: 9500,
      currency: "USD",
      requiresHumanApprovalBeforeSend: false,
      targetState: "generated",
      recipients: [
        {
          name: "Cory Gibson",
          email: "ops@syndicateai.co",
          role: "signer",
          routingOrder: 1
        }
      ]
    });

    const sent = await crmService.sendContract(context, adminSession, contract.id);
    expect(sent.state).toBe("sent");

    const payload = JSON.stringify({
      event: "document.completed",
      data: {
        contract_id: contract.id,
        workspace_id: context.workspace_id,
        tenant_id: context.tenant_id,
        external_contract_id: sent.externalContractId,
        document_url: "https://stub.pandadoc.local/contracts/completed"
      }
    });

    const request = new NextRequestCtor("http://localhost/api/webhooks/pandadoc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-pandadoc-signature": signPandadocWebhookPayload(payload)
      },
      body: payload
    });
    const response = await webhookPost(request);
    expect(response.status).toBe(200);

    const hydrated = await crmService.getContract(context, contract.id);
    expect(hydrated.contract.state).toBe("completed");
    expect(hydrated.events.some((event) => event.toState === "completed")).toBe(true);
  });
});
