import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { resolveWorkforceContext } from "@/lib/server/workforce/context";
import { WorkforceSuggestionListSchema } from "@/lib/types/workforce";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.read_all", "tenant.onboarding.update_all"]);
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(8, limitValue)) : 8;
    const suggestions = await workforceService.suggestPeople(resolveWorkforceContext(me), query, limit);
    return NextResponse.json(WorkforceSuggestionListSchema.parse({ suggestions }));
  } catch (error) {
    return safeRouteError(error);
  }
}
