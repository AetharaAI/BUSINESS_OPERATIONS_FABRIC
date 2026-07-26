import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { WorkforceInviteRequestSchema, WorkforceInviteResponseSchema } from "@/lib/types/workforce";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("tenant.onboarding.update_all");
    const parsed = WorkforceInviteRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const response = await workforceService.sendInvite(me, parsed.data.onboarding_case_id);
    return NextResponse.json(WorkforceInviteResponseSchema.parse(response));
  } catch (error) {
    return safeRouteError(error);
  }
}
