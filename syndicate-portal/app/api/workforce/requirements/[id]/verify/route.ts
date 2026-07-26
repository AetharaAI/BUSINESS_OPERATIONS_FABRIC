import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { ComplianceDocumentRequirementSchema, WorkforceVerifyRequirementRequestSchema } from "@/lib/types/workforce";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("tenant.onboarding.update_all");
    const parsed = WorkforceVerifyRequirementRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.verification_status === "pending") {
      return NextResponse.json({ error: "verification_status must be verified or rejected" }, { status: 400 });
    }

    const { id } = await params;
    const response = await workforceService.verifyRequirement(me, id, parsed.data.verification_status, parsed.data.notes);
    return NextResponse.json(ComplianceDocumentRequirementSchema.parse(response));
  } catch (error) {
    return safeRouteError(error);
  }
}
