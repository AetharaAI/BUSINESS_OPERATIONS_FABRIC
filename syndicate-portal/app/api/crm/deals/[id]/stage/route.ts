import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { UpdateDealStageRequestSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("deal.stage.update");
    const parsed = UpdateDealStageRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const { id } = await params;
    const deal = await crmService.updateDealStage(context, id, parsed.data.stage);
    return NextResponse.json(deal);
  } catch (error) {
    return safeRouteError(error);
  }
}
