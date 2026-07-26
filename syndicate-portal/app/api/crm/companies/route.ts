import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { CreateCompanyRequestSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("company.create");
    const parsed = CreateCompanyRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const company = await crmService.createCompany(context, me, {
      name: parsed.data.name,
      website: parsed.data.website,
      industry: parsed.data.industry,
      notes: parsed.data.notes
    });
    return NextResponse.json(company);
  } catch (error) {
    return safeRouteError(error);
  }
}
