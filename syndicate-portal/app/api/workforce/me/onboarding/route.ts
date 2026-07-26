import { NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { WorkforceOnboardingBundleSchema } from "@/lib/types/workforce";

export async function GET(): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.read_own", "tenant.onboarding.read_all"]);
    const bundle = await workforceService.getOnboardingBundleForSession(me);
    return NextResponse.json(WorkforceOnboardingBundleSchema.parse(bundle));
  } catch (error) {
    return safeRouteError(error);
  }
}
