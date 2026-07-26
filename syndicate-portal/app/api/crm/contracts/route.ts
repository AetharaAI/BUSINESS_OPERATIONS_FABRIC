import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { CreateContractRequestSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["contract.create_draft", "contract.generate"]);
    const parsed = CreateContractRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const contract = await crmService.createContract(context, me, {
      dealId: parsed.data.deal_id,
      companyId: parsed.data.company_id,
      primaryContactId: parsed.data.primary_contact_id,
      title: parsed.data.title,
      approvedTemplateId: parsed.data.approved_template_id,
      contractValue: parsed.data.contract_value,
      currency: parsed.data.currency,
      requiresHumanApprovalBeforeSend: parsed.data.requires_human_approval_before_send,
      customLegalTerms: parsed.data.custom_legal_terms,
      targetState: parsed.data.target_state,
      recipients: parsed.data.recipients.map((recipient) => ({
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
        routingOrder: recipient.routing_order
      }))
    });
    return NextResponse.json(contract);
  } catch (error) {
    return safeRouteError(error);
  }
}
