import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { parseInviteToken } from "@/lib/server/invite-tokens";
import { serverEnv } from "@/lib/server/env";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { InviteActivationRequestSchema } from "@/lib/types/portal";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const parsedBody = InviteActivationRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    const { token, new_password } = parsedBody.data;
    const invite = parseInviteToken(token);

    if (!serverEnv.voiceOpsPasswordResetPath) {
      return NextResponse.json(
        {
          error:
            "VOICEOPS_PASSWORD_RESET_PATH is not configured. Set it to your VoiceOps reset endpoint path (example: /api/v1/auth/change-password)."
        },
        { status: 501 }
      );
    }

    await voiceOpsRequest<unknown>({
      method: "POST",
      path: serverEnv.voiceOpsPasswordResetPath,
      body: {
        email: invite.email,
        tenant_id: invite.tenant_id,
        temporary_password: invite.temp_password,
        new_password
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeRouteError(error);
  }
}
