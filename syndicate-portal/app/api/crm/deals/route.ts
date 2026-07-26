import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { CreateDealRequestSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("deal.create");
    const parsed = CreateDealRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const deal = await crmService.createDeal(context, me, {
      companyId: parsed.data.company_id,
      primaryContactId: parsed.data.primary_contact_id,
      name: parsed.data.name,
      stage: parsed.data.stage,
      amountCents: parsed.data.amount_cents,
      currency: parsed.data.currency,
      notes: parsed.data.notes
    });
    return NextResponse.json(deal);
  } catch (error) {
    return safeRouteError(error);
  }
}
