import { NextRequest, NextResponse } from "next/server";
import { crmService } from "@/lib/server/crm/service";
import { PandadocWebhookPayloadSchema } from "@/lib/types/crm";
import { verifyPandadocWebhookSignature } from "@/lib/server/crm/pandadoc-adapter";

export const runtime = "nodejs";

const systemWebhookSession = {
  user_id: null,
  email: "system@pandadoc-webhook.local",
  role: "system",
  workforce_role: "platform_admin",
  is_platform_admin: true,
  is_internal_admin: true,
  subject: "system:pandadoc-webhook",
  handle: "pandadoc-webhook",
  capability_scope: ["contract.send", "contract.read", "audit.read_all"],
  tenant_scope_mode: "all",
  tenant_id: null,
  tenant_name: null
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get("x-pandadoc-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing x-pandadoc-signature header" }, { status: 400 });
    }

    const rawBody = await request.text();
    if (!verifyPandadocWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const parsed = PandadocWebhookPayloadSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid webhook payload", details: parsed.error.flatten() }, { status: 400 });
    }

    await crmService.applyPandadocWebhook(
      {
        workspace_id: parsed.data.data.workspace_id,
        tenant_id: parsed.data.data.tenant_id
      },
      systemWebhookSession,
      {
        contractId: parsed.data.data.contract_id,
        event: parsed.data.event,
        externalContractId: parsed.data.data.external_contract_id,
        documentUrl: parsed.data.data.document_url
      }
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
