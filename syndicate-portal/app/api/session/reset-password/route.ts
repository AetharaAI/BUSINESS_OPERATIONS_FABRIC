import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { ResetPasswordRequestSchema } from "@/lib/types/portal";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const parsedBody = ResetPasswordRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/auth/reset-password",
      body: parsedBody.data
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeRouteError(error);
  }
}
