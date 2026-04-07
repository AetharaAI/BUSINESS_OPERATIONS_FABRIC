import { NextRequest, NextResponse } from "next/server";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { ChangePasswordRequestSchema } from "@/lib/types/portal";
import { readSessionToken } from "@/lib/server/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await readSessionToken();
    if (!token) {
      return unauthorized();
    }

    const parsedBody = ChangePasswordRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/auth/change-password",
      token,
      body: parsedBody.data
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeRouteError(error);
  }
}
