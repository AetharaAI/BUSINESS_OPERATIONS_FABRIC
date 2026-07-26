import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { CrmContextSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("contract.read");
    const parsed = CrmContextSchema.safeParse({
      workspace_id: request.nextUrl.searchParams.get("workspace_id"),
      tenant_id: request.nextUrl.searchParams.get("tenant_id")
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const { id } = await params;
    const contract = await crmService.getContract(context, id);
    return NextResponse.json(contract);
  } catch (error) {
    return safeRouteError(error);
  }
}
