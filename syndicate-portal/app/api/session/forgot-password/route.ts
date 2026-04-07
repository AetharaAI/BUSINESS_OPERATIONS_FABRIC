import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { ForgotPasswordRequestSchema } from "@/lib/types/portal";
import { serverEnv } from "@/lib/server/env";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const parsedBody = ForgotPasswordRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    const headers = serverEnv.voiceOpsPlatformAdminKey
      ? { "x-platform-admin-key": serverEnv.voiceOpsPlatformAdminKey }
      : undefined;

    // Intentionally return neutral success regardless of account existence to avoid account enumeration.
    try {
      await voiceOpsRequest<unknown>({
        method: "POST",
        path: "/api/v1/auth/forgot-password",
        headers,
        body: parsedBody.data
      });
    } catch {
      // Keep response neutral for privacy/rate-limit friendliness.
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, password reset instructions have been sent."
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
