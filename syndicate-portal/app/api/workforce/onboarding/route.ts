import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { resolveWorkforceContext } from "@/lib/server/workforce/context";
import { WorkforceOnboardingBundleListSchema, WorkforceOnboardingUpsertRequestSchema } from "@/lib/types/workforce";

export async function GET(): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.read_all", "tenant.onboarding.update_all"]);
    const items = await workforceService.listOnboardingBundles(resolveWorkforceContext(me));
    return NextResponse.json(WorkforceOnboardingBundleListSchema.parse({ items }));
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("tenant.onboarding.update_all");
    const parsed = WorkforceOnboardingUpsertRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const bundle = await workforceService.upsertOnboardingCase(me, parsed.data);
    return NextResponse.json(bundle);
  } catch (error) {
    return safeRouteError(error);
  }
}
